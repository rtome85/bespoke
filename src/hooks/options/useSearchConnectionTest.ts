import type { Dispatch, SetStateAction } from "react"
import { useEffect, useRef, useState } from "react"

import { searchWeb } from "~api/searchClient"
import { SEARCH_ENGINE_META } from "~constants/research"
import type { SearchConfig } from "~types/config"
import type { OperationStatus } from "~types/options"

const STATUS_RESET_MS = 5_000

/**
 * "Test connection" for the web-search account. Mirrors
 * `usePerplexityConnectionTest`: the banner self-clears, while the stored
 * `lastTested` verdict is what keeps the roster honest across reloads.
 */
export function useSearchConnectionTest(
  config: SearchConfig,
  setConfig: Dispatch<SetStateAction<SearchConfig>>
) {
  const [status, setStatus] = useState<OperationStatus>({
    type: "idle",
    message: ""
  })
  const runIdRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      setStatus({ type: "error", message: "Please enter API key first" })
      return
    }

    const runId = ++runIdRef.current
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    setStatus({ type: "loading", message: "Testing connection..." })

    const name = SEARCH_ENGINE_META[config.engine].name
    let ok = false
    let message = ""
    try {
      const results = await searchWeb(config, `${name} connection test`, 1)
      ok = true
      message = results.length
        ? `Connection successful! ${name} is ready.`
        : `${name} answered, but returned no results.`
    } catch (error) {
      message =
        error instanceof Error
          ? error.message
          : "Connection failed. Check your key and your internet connection."
    }

    // A newer test (or a key edit that reset the status) supersedes this one.
    if (!mountedRef.current || runIdRef.current !== runId) return

    setConfig((previous) => ({
      ...previous,
      lastTested: { ok, at: new Date().toISOString(), message }
    }))
    setStatus({ type: ok ? "success" : "error", message })

    resetTimerRef.current = setTimeout(
      () => setStatus({ type: "idle", message: "" }),
      STATUS_RESET_MS
    )
  }

  /** Drop an in-flight test and its banner; used when the key or engine changes. */
  const resetStatus = () => {
    runIdRef.current++
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    setStatus({ type: "idle", message: "" })
  }

  return { status, testConnection, resetStatus }
}

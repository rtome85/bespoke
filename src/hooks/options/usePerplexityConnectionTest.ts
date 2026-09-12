import { useEffect, useRef, useState } from "react"

import type { PerplexityConfig } from "~types/config"
import type { OperationStatus } from "~types/options"

const TEST_TIMEOUT_MS = 30_000
const STATUS_RESET_MS = 5_000

export function usePerplexityConnectionTest(config: PerplexityConfig) {
  const [status, setStatus] = useState<OperationStatus>({
    type: "idle",
    message: ""
  })
  const controllerRef = useRef<AbortController | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const testConnection = async () => {
    if (!config.apiKey) {
      setStatus({ type: "error", message: "Please enter API key first" })
      return
    }

    controllerRef.current?.abort()
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)

    const controller = new AbortController()
    controllerRef.current = controller
    const requestTimer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)
    setStatus({ type: "loading", message: "Testing connection..." })

    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              {
                role: "user",
                content: "Say 'Connection successful' in one sentence."
              }
            ],
            max_tokens: 20
          }),
          signal: controller.signal
        }
      )

      if (!mountedRef.current || controllerRef.current !== controller) return
      setStatus(
        response.ok
          ? {
              type: "success",
              message: "Connection successful! Perplexity Sonar is ready."
            }
          : {
              type: "error",
              message: `Connection failed: ${response.status} ${response.statusText}`
            }
      )
    } catch {
      if (!mountedRef.current || controllerRef.current !== controller) return
      setStatus({
        type: "error",
        message:
          "Connection failed. Please check your internet connection and API key."
      })
    } finally {
      clearTimeout(requestTimer)
      if (controllerRef.current === controller) controllerRef.current = null
    }

    if (!mountedRef.current) return
    resetTimerRef.current = setTimeout(
      () => setStatus({ type: "idle", message: "" }),
      STATUS_RESET_MS
    )
  }

  return { status, testConnection }
}

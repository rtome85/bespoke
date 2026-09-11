import { useCallback, useEffect, useRef, useState } from "react"

// Optimistic local state + a debounced chrome.storage.local write. The
// onChanged listener tells its own write's echo apart from a genuinely
// external change (another extension surface writing the same key, a Drive
// pull) by comparing against the value it actually sent — a "write in
// flight" flag alone can't make that call, since an external write can land
// in the same window as our own pending or just-sent write, and would
// otherwise be silently dropped and then clobbered by our stale content.
export function useDebouncedStorage<T>(
  key: string,
  defaultValue: T,
  delay = 400
): [T, (value: T | ((prev: T) => T)) => void] {
  const [local, setLocal] = useState<T>(defaultValue)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const pendingValue = useRef<T | undefined>(undefined)
  const lastSentValue = useRef<T | undefined>(undefined)
  const hasSentValue = useRef(false)
  // Kept in sync with `local` on every render so setValue can read the
  // latest value without a functional setState updater — see below.
  const latestLocal = useRef(local)
  latestLocal.current = local

  // Load initial value from storage
  useEffect(() => {
    chrome.storage.local.get(key, (res) => {
      if (res[key] !== undefined) setLocal(res[key] as T)
    })
  }, [key])

  // Sync external storage changes
  useEffect(() => {
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local" || !(key in changes)) return
      const incoming = changes[key].newValue as T
      const isOwnEcho =
        hasSentValue.current &&
        JSON.stringify(incoming) === JSON.stringify(lastSentValue.current)
      if (isOwnEcho) {
        hasSentValue.current = false
        return
      }
      // A genuinely external write — adopt it, and drop anything of ours
      // still queued so it doesn't later overwrite this with stale content.
      if (timer.current) clearTimeout(timer.current)
      pendingValue.current = undefined
      setLocal(incoming)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [key])

  // Side effects (timer scheduling, ref bookkeeping) live here, in a plain
  // callback — not inside setLocal's updater, which React may invoke more
  // than once for a single update and which must stay pure.
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const next =
        typeof value === "function"
          ? (value as (prev: T) => T)(latestLocal.current)
          : value
      setLocal(next)
      if (timer.current) clearTimeout(timer.current)
      pendingValue.current = next
      timer.current = setTimeout(() => {
        lastSentValue.current = next
        hasSentValue.current = true
        chrome.storage.local.set({ [key]: next })
        pendingValue.current = undefined
      }, delay)
    },
    [key, delay]
  )

  // Flush a still-pending debounced write immediately before the page
  // unloads — a popup window can close (Escape, its own close button, the
  // native title-bar close button) well inside the debounce window, which
  // would otherwise silently drop the last edit.
  useEffect(() => {
    const flush = () => {
      if (pendingValue.current === undefined) return
      if (timer.current) clearTimeout(timer.current)
      lastSentValue.current = pendingValue.current
      hasSentValue.current = true
      chrome.storage.local.set({ [key]: pendingValue.current })
      pendingValue.current = undefined
    }
    window.addEventListener("beforeunload", flush)
    return () => window.removeEventListener("beforeunload", flush)
  }, [key])

  return [local, setValue]
}

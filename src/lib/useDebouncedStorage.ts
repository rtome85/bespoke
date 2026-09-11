import { useCallback, useEffect, useRef, useState } from "react"

// Optimistic local state + a debounced chrome.storage.local write, with
// onChanged reconciliation that ignores echoes of this hook's own writes (so
// an external writer — another extension surface, a Drive pull — can still
// push updates in without fighting the debounce timer).
export function useDebouncedStorage<T>(
  key: string,
  defaultValue: T,
  delay = 400
): [T, (value: T | ((prev: T) => T)) => void] {
  const [local, setLocal] = useState<T>(defaultValue)
  const pendingWriteId = useRef(0)
  const lastWriteId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const pendingValue = useRef<T | undefined>(undefined)

  // Load initial value from storage
  useEffect(() => {
    chrome.storage.local.get(key, (res) => {
      if (res[key] !== undefined) setLocal(res[key] as T)
    })
  }, [key])

  // Sync external storage changes (e.g. from pull)
  useEffect(() => {
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local" || !(key in changes)) return
      if (lastWriteId.current === pendingWriteId.current) {
        setLocal(changes[key].newValue as T)
      } else {
        lastWriteId.current = pendingWriteId.current
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setLocal((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        if (timer.current) clearTimeout(timer.current)
        pendingWriteId.current += 1
        pendingValue.current = next
        timer.current = setTimeout(() => {
          chrome.storage.local.set({ [key]: next })
          pendingValue.current = undefined
        }, delay)
        return next
      })
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
      chrome.storage.local.set({ [key]: pendingValue.current })
      pendingValue.current = undefined
    }
    window.addEventListener("beforeunload", flush)
    return () => window.removeEventListener("beforeunload", flush)
  }, [key])

  return [local, setValue]
}

import { useEffect, useState } from "react"

// chrome.storage.local's default quota without the `unlimitedStorage`
// permission (Chrome 114+). Firefox doesn't expose QUOTA_BYTES.
const FALLBACK_QUOTA_BYTES = 10_485_760
const REFRESH_DEBOUNCE_MS = 500

async function readBytesInUse(): Promise<number> {
  const local = chrome.storage.local
  if (typeof local.getBytesInUse === "function") {
    try {
      return await new Promise<number>((resolve, reject) => {
        local.getBytesInUse(null, (n) => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve(n)
        })
      })
    } catch {
      // Firefox MV2 doesn't implement getBytesInUse — estimate below.
    }
  }
  const items = await new Promise<Record<string, unknown>>((resolve) =>
    local.get(null, resolve)
  )
  const encoder = new TextEncoder()
  return Object.entries(items).reduce(
    (sum, [key, value]) =>
      sum + encoder.encode(key + JSON.stringify(value)).length,
    0
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Rail footer meter showing how much of `chrome.storage.local` is in use.
 * Refreshes (debounced) whenever local storage changes.
 */
export function StorageUsage() {
  const [bytes, setBytes] = useState<number | null>(null)
  const quota = chrome.storage.local.QUOTA_BYTES ?? FALLBACK_QUOTA_BYTES

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      readBytesInUse()
        .then((n) => {
          if (!cancelled) setBytes(n)
        })
        .catch(() => {})
    }

    const onChanged = (
      _changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "local") return
      clearTimeout(timer)
      timer = setTimeout(refresh, REFRESH_DEBOUNCE_MS)
    }

    refresh()
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      cancelled = true
      clearTimeout(timer)
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [])

  if (bytes === null) return null

  const percent = Math.min(100, (bytes / quota) * 100)
  const label = percent < 1 && bytes > 0 ? "<1%" : `${Math.round(percent)}%`
  const barColor =
    percent >= 90
      ? "bg-aa-error"
      : percent >= 75
        ? "bg-aa-warning"
        : "bg-aa-primary"
  const detail = `Local storage: ${formatBytes(bytes)} of ${formatBytes(quota)} used (${label})`

  return (
    <div
      title={detail}
      className="flex flex-col gap-1.5 px-2 lg:px-2.5 min-w-0"
      role="meter"
      aria-label="Local storage used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={detail}>
      <div className="flex items-center justify-center lg:justify-between gap-2">
        <span className="hidden lg:inline text-aa-10 font-bold tracking-aa-wider-10 text-aa-neutral-400 uppercase">
          Storage
        </span>
        <span className="text-aa-11 font-semibold tabular-nums text-aa-neutral-400">
          {label}
        </span>
      </div>
      <div className="h-1 w-full rounded-aa-pill bg-aa-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-aa-pill transition-all duration-200 ease-out ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="hidden lg:inline text-aa-11 text-aa-neutral-500 tabular-nums truncate">
        {formatBytes(bytes)} of {formatBytes(quota)}
      </span>
    </div>
  )
}

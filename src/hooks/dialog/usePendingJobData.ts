import { useEffect, useRef } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import type { PendingJobData } from "~types/dialog"

interface IgnoredChange {
  matched: false
}

interface PendingJobChange {
  matched: true
  data: PendingJobData | null
}

export function readPendingJobDataChange(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string
): IgnoredChange | PendingJobChange {
  if (area !== "local" || !(STORAGE_KEYS.PENDING_JOB_DATA in changes)) {
    return { matched: false }
  }

  return {
    matched: true,
    data:
      (changes[STORAGE_KEYS.PENDING_JOB_DATA].newValue as
        | PendingJobData
        | undefined) ?? null
  }
}

export function usePendingJobData(
  onChange: (pendingJobData: PendingJobData | null) => void
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    // Registered for the page's whole lifetime so a second "Check my match"
    // trigger can move an already-open side panel back to extraction.
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      const change = readPendingJobDataChange(changes, area)
      if (change.matched) onChangeRef.current(change.data)
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])
}

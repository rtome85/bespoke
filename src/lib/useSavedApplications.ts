import { useEffect, useState } from "react"

import { migrateInterviewsSchema } from "~lib/interviews/migrate"
import { STORAGE_KEYS } from "~storage/keys"
import type { SavedApplication } from "~types/userProfile"

const KEY = STORAGE_KEYS.SAVED_APPLICATIONS

/**
 * Live view of `savedApplications`. Runs the interviews migration once before
 * the first read (idempotent + version-guarded) and stays in sync via
 * `storage.onChanged` — mutations go through `mutateSavedApplications`, so
 * there's no local snapshot for callers to maintain.
 */
export function useSavedApplications(): SavedApplication[] {
  const [apps, setApps] = useState<SavedApplication[]>([])

  useEffect(() => {
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes[KEY]) {
        setApps(
          Array.isArray(changes[KEY].newValue) ? changes[KEY].newValue : []
        )
      }
    }
    chrome.storage.onChanged.addListener(listener)

    migrateInterviewsSchema()
      .catch(() => {})
      .finally(() => {
        chrome.storage.local.get(KEY, (res) => {
          if (Array.isArray(res[KEY])) setApps(res[KEY])
        })
      })

    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return apps
}

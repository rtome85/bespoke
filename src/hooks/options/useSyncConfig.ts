import { useEffect, useState } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import type { SyncConfig } from "~utils/googleDriveSync"

export function useSyncConfig() {
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null)

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.SYNC_CONFIG, (result) => {
      setSyncConfig(result[STORAGE_KEYS.SYNC_CONFIG] ?? null)
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local" || !(STORAGE_KEYS.SYNC_CONFIG in changes)) return
      setSyncConfig(changes[STORAGE_KEYS.SYNC_CONFIG].newValue ?? null)
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return syncConfig
}

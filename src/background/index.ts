import { SYNC_KEYS } from "~storage/keys"
import { push } from "~utils/googleDriveSync"

import { createContextMenu } from "~background/context-menu"

chrome.runtime.onInstalled.addListener(async () => {
  await createContextMenu()
})

// Re-create context menu on startup (service worker restart)
chrome.runtime.onStartup.addListener(async () => {
  await createContextMenu()
})

// Auto-sync: push to Google Drive after any change to syncable keys
let debounceTimer: ReturnType<typeof setTimeout> | null = null

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return
  const hasSyncKey = SYNC_KEYS.some((k) => k in changes)
  if (!hasSyncKey) return

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const { syncConfig } = await chrome.storage.local.get("syncConfig")
    if (!syncConfig?.token) return
    try {
      await push(syncConfig.token)
      const { syncConfig: current } = await chrome.storage.local.get("syncConfig")
      if (current?.token === syncConfig.token) {
        await chrome.storage.local.set({
          syncConfig: { ...current, lastSynced: new Date().toISOString(), error: undefined }
        })
      }
    } catch (err) {
      // Mark sync error (token may be expired)
      const { syncConfig: current } = await chrome.storage.local.get("syncConfig")
      if (current?.token === syncConfig.token) {
        await chrome.storage.local.set({
          syncConfig: { ...current, error: (err as Error).message }
        })
      }
    }
  }, 2_000)
})

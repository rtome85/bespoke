import {
  createContextMenu,
  handleContextMenuClick
} from "~background/context-menu"
import { migrateInterviewsSchema } from "~lib/interviews/migrate"
import { SYNC_KEYS } from "~storage/keys"
import { push } from "~utils/googleDriveSync"

// MV3: must be registered at top-level so it persists across service worker restarts
chrome.contextMenus.onClicked.addListener(handleContextMenuClick)

chrome.runtime.onInstalled.addListener(async () => {
  await createContextMenu()
  await migrateInterviewsSchema()
})

// Re-create context menu on startup (service worker restart)
chrome.runtime.onStartup.addListener(async () => {
  await createContextMenu()
  await migrateInterviewsSchema()
})

// Auto-sync: push to Google Drive after any change to syncable keys
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pushChain = Promise.resolve()

function enqueuePush(fn: () => Promise<void>): Promise<void> {
  const next = pushChain.then(() => fn())
  pushChain = next.catch(() => {}) // keep chain alive even if fn throws
  return next
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return
  const hasSyncKey = SYNC_KEYS.some((k) => k in changes)
  if (!hasSyncKey) return

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const { syncConfig } = await chrome.storage.local.get("syncConfig")
    if (!syncConfig?.token) return
    try {
      await enqueuePush(() => push(syncConfig.token))
      const { syncConfig: current } =
        await chrome.storage.local.get("syncConfig")
      if (current?.token === syncConfig.token) {
        await chrome.storage.local.set({
          syncConfig: {
            ...current,
            lastSynced: new Date().toISOString(),
            error: undefined
          }
        })
      }
    } catch (err) {
      // Mark sync error (token may be expired)
      const { syncConfig: current } =
        await chrome.storage.local.get("syncConfig")
      if (current?.token === syncConfig.token) {
        await chrome.storage.local.set({
          syncConfig: { ...current, error: (err as Error).message }
        })
      }
    }
  }, 2_000)
})

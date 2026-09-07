import {
  createContextMenu,
  handleContextMenuClick
} from "~background/context-menu"
import { migrateInterviewsSchema } from "~lib/interviews/migrate"
import { parseReminderAlarm } from "~lib/interviews/reminders"
import { formatLabel, roundLabel } from "~lib/interviews/selectors"
import { STORAGE_KEYS, SYNC_KEYS } from "~storage/keys"
import type { InterviewRound, SavedApplication } from "~types/userProfile"
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

// ── Interview reminders ──────────────────────────────────────────────────────

const SCHEDULE_URL = "options.html#/interviews/schedule"

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const parsed = parseReminderAlarm(alarm.name)
  if (!parsed) return

  const { [STORAGE_KEYS.SAVED_APPLICATIONS]: stored } =
    await chrome.storage.local.get(STORAGE_KEYS.SAVED_APPLICATIONS)
  const apps: SavedApplication[] = Array.isArray(stored) ? stored : []

  let hit: { app: SavedApplication; round: InterviewRound } | undefined
  for (const app of apps) {
    const round = (app.rounds ?? []).find((r) => r.id === parsed.roundId)
    if (round) {
      hit = { app, round }
      break
    }
  }
  if (!hit || !hit.round.date || !hit.round.time) return

  const lead = parsed.key === "24h" ? "Tomorrow" : "In 1 hour"
  const fmt = formatLabel(hit.round.format)
  const icons = chrome.runtime.getManifest().icons
  chrome.notifications.create(alarm.name, {
    type: "basic",
    iconUrl: chrome.runtime.getURL(
      icons?.["128"] ?? icons?.["48"] ?? "icon.png"
    ),
    title: `${hit.app.company} · ${roundLabel(hit.round)}`,
    message: `${lead} at ${hit.round.time}${fmt ? ` · ${fmt}` : ""}`,
    priority: 1
  })
})

chrome.notifications.onClicked.addListener((id) => {
  if (!parseReminderAlarm(id)) return
  chrome.tabs.create({ url: chrome.runtime.getURL(SCHEDULE_URL) })
  chrome.notifications.clear(id)
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

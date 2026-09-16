import {
  createContextMenu,
  handleContextMenuClick
} from "~background/context-menu"
import { migrateInterviewsSchema } from "~lib/interviews/migrate"
import {
  DEBRIEF_NUDGE_KEY,
  LEAD_TIMES,
  parseReminderAlarm,
  readReminderSettings,
  remindersEnabled,
  showReminderNotification,
  TEST_NOTIFICATION_ID
} from "~lib/interviews/reminders"
import { formatLabel, roundLabel } from "~lib/interviews/selectors"
import { STORAGE_KEYS, SYNC_KEYS } from "~storage/keys"
import type { InterviewRound, SavedApplication } from "~types/userProfile"
import {
  getFreshToken,
  isCurrentConnection,
  push
} from "~utils/googleDriveSync"

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
  // No reminders for a round whose application has been rejected (the status
  // may have changed after the alarm was scheduled — via a debrief outcome,
  // a manual status change, etc.).
  if (hit.app.status === "Reject") return

  // Settings may also have changed since scheduling; honour the current ones.
  if (!(await remindersEnabled())) return
  const settings = await readReminderSettings()
  const title = `${hit.app.company} · ${roundLabel(hit.round)}`

  if (parsed.key === DEBRIEF_NUDGE_KEY) {
    if (!settings.debriefNudge || hit.round.debrief?.loggedAt) return
    await showReminderNotification(
      alarm.name,
      title,
      "How did it go? Log your debrief while it's fresh."
    )
    return
  }

  const lead = LEAD_TIMES.find((t) => t.key === parsed.key)
  if (!lead || !settings.leadTimes.includes(lead.key)) return
  const fmt = formatLabel(hit.round.format)
  await showReminderNotification(
    alarm.name,
    title,
    `${lead.notice} at ${hit.round.time}${fmt ? ` · ${fmt}` : ""}`
  )
})

chrome.notifications.onClicked.addListener((id) => {
  if (id === TEST_NOTIFICATION_ID) {
    chrome.notifications.clear(id)
    return
  }
  const parsed = parseReminderAlarm(id)
  if (!parsed) return
  const url =
    parsed.key === DEBRIEF_NUDGE_KEY
      ? `options.html#/interviews/debriefs/${encodeURIComponent(parsed.roundId)}`
      : SCHEDULE_URL
  chrome.tabs.create({ url: chrome.runtime.getURL(url) })
  chrome.notifications.clear(id)
})

// Auto-sync: push to Google Drive after any change to syncable keys
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pushChain: Promise<unknown> = Promise.resolve()

function enqueuePush<T>(fn: () => Promise<T>): Promise<T> {
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
    const { connectionId } = syncConfig
    try {
      // Resolve the token inside the queue, and re-check the connection right
      // before pushing: a disconnect may land while this push waits its turn.
      const pushed = await enqueuePush(async () => {
        const { syncConfig: latest } =
          await chrome.storage.local.get("syncConfig")
        if (!latest?.token || latest.connectionId !== connectionId) return false
        const token = await getFreshToken(latest)
        if (!(await isCurrentConnection(connectionId))) return false
        await push(token)
        return true
      })
      if (!pushed) return
      const { syncConfig: current } =
        await chrome.storage.local.get("syncConfig")
      if (current?.token && current.connectionId === connectionId) {
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
      if (current?.token && current.connectionId === connectionId) {
        await chrome.storage.local.set({
          syncConfig: { ...current, error: (err as Error).message }
        })
      }
    }
  }, 2_000)
})

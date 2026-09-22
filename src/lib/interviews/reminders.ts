import { roundStartMs } from "~lib/interviews/selectors"
import { STORAGE_KEYS } from "~storage/keys"
import type { InterviewRound, SavedApplication } from "~types/userProfile"

// `chrome.alarms` reminders for scheduled interview rounds. Alarm names are
// `interview-reminder:<roundId>:<key>`, one per selected lead time plus an
// optional `debrief` nudge after the round.

const PREFIX = "interview-reminder"

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Selectable lead times before the round start. Keys are alarm-name suffixes. */
export const LEAD_TIMES = [
  { key: "1w", label: "1 week before", notice: "In 1 week", ms: 7 * DAY_MS },
  { key: "3d", label: "3 days before", notice: "In 3 days", ms: 3 * DAY_MS },
  { key: "24h", label: "1 day before", notice: "Tomorrow", ms: DAY_MS },
  { key: "3h", label: "3 hours before", notice: "In 3 hours", ms: 3 * HOUR_MS },
  { key: "1h", label: "1 hour before", notice: "In 1 hour", ms: HOUR_MS },
  {
    key: "15m",
    label: "15 minutes before",
    notice: "In 15 minutes",
    ms: 15 * MINUTE_MS
  }
] as const

export type LeadTimeKey = (typeof LEAD_TIMES)[number]["key"]

/** Alarm key for the "log your debrief" nudge after a round. */
export const DEBRIEF_NUDGE_KEY = "debrief"

/** How long after the round start the debrief nudge fires. */
export const DEBRIEF_NUDGE_DELAY_MS = 3 * HOUR_MS

export interface ReminderSettings {
  leadTimes: LeadTimeKey[]
  debriefNudge: boolean
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  leadTimes: ["24h", "1h"],
  debriefNudge: true
}

/** Coerce a stored value into valid settings, falling back per field. */
export function normalizeReminderSettings(value: unknown): ReminderSettings {
  const raw = (value ?? {}) as Partial<ReminderSettings>
  return {
    leadTimes: Array.isArray(raw.leadTimes)
      ? LEAD_TIMES.map((t) => t.key).filter((k) =>
          (raw.leadTimes as unknown[]).includes(k)
        )
      : DEFAULT_REMINDER_SETTINGS.leadTimes,
    debriefNudge:
      typeof raw.debriefNudge === "boolean"
        ? raw.debriefNudge
        : DEFAULT_REMINDER_SETTINGS.debriefNudge
  }
}

export async function readReminderSettings(): Promise<ReminderSettings> {
  const res = await chrome.storage.local.get(
    STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS
  )
  return normalizeReminderSettings(
    res[STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS]
  )
}

const alarmName = (roundId: string, key: string) =>
  `${PREFIX}:${roundId}:${key}`

export function parseReminderAlarm(
  name: string
): { roundId: string; key: string } | null {
  const parts = name.split(":")
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  return { roundId: parts[1], key: parts[2] }
}

export async function remindersEnabled(): Promise<boolean> {
  const res = await chrome.storage.local.get(
    STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED
  )
  // Default on: only an explicit `false` disables.
  return res[STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED] !== false
}

async function clearByPrefix(prefix: string): Promise<void> {
  const all = await chrome.alarms.getAll()
  await Promise.all(
    all
      .filter((a) => a.name.startsWith(prefix))
      .map((a) => chrome.alarms.clear(a.name))
  )
}

/** Remove every reminder alarm for one round. */
export function clearRoundAlarms(roundId: string): Promise<void> {
  return clearByPrefix(`${PREFIX}:${roundId}:`)
}

/**
 * Reconcile a round's alarms: clear its existing ones, then (if reminders are
 * on and the round has a future date+time) create one alarm per selected lead
 * time plus the debrief nudge, skipping any that are already in the past.
 */
export async function syncRoundAlarms(round: InterviewRound): Promise<void> {
  await clearRoundAlarms(round.id)
  if (!(await remindersEnabled())) return

  const start = roundStartMs(round)
  if (start == null) return

  const settings = await readReminderSettings()
  const now = Date.now()
  for (const lead of LEAD_TIMES) {
    if (!settings.leadTimes.includes(lead.key)) continue
    const when = start - lead.ms
    if (when > now)
      chrome.alarms.create(alarmName(round.id, lead.key), { when })
  }
  if (settings.debriefNudge && !round.debrief?.loggedAt) {
    const when = start + DEBRIEF_NUDGE_DELAY_MS
    if (when > now) {
      chrome.alarms.create(alarmName(round.id, DEBRIEF_NUDGE_KEY), { when })
    }
  }
}

/** Drop every interview reminder alarm (used when the toggle goes off). */
export function clearAllReminderAlarms(): Promise<void> {
  return clearByPrefix(`${PREFIX}:`)
}

/** Rebuild every reminder alarm from the current rounds (toggle on / recovery). */
export async function resyncAllReminderAlarms(
  apps: SavedApplication[]
): Promise<void> {
  await clearAllReminderAlarms()
  if (!(await remindersEnabled())) return
  for (const app of apps) {
    for (const round of app.rounds ?? []) await syncRoundAlarms(round)
  }
}

/** Show a reminder-styled browser notification with the extension icon. */
export function showReminderNotification(
  id: string,
  title: string,
  message: string
): Promise<string> {
  const icons = chrome.runtime.getManifest().icons
  return new Promise((resolve, reject) =>
    chrome.notifications.create(
      id,
      {
        type: "basic",
        iconUrl: chrome.runtime.getURL(
          icons?.["128"] ?? icons?.["48"] ?? "icon.png"
        ),
        title,
        message,
        priority: 1
      },
      (createdId) => {
        const err = chrome.runtime.lastError
        if (err) reject(new Error(err.message))
        else resolve(createdId)
      }
    )
  )
}

export const TEST_NOTIFICATION_ID = "interview-reminder-test"

/**
 * Fire a sample reminder. Resolves `"blocked"` when the browser reports that
 * notifications are denied for the extension (Chrome only — Firefox has no
 * permission-level API, so it always resolves `"sent"`).
 */
export async function sendTestReminder(): Promise<"sent" | "blocked"> {
  if (typeof chrome.notifications.getPermissionLevel === "function") {
    const level = await new Promise<string>((resolve) =>
      chrome.notifications.getPermissionLevel(resolve)
    )
    if (level === "denied") return "blocked"
  }
  await showReminderNotification(
    TEST_NOTIFICATION_ID,
    "Acme Corp · Technical interview",
    "Tomorrow at 10:00 · Video call — this is a test reminder"
  )
  return "sent"
}

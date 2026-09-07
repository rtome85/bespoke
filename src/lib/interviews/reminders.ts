import { roundStartMs } from "~lib/interviews/selectors"
import { STORAGE_KEYS } from "~storage/keys"
import type { InterviewRound, SavedApplication } from "~types/userProfile"

// `chrome.alarms` reminders for scheduled interview rounds. Alarm names are
// `interview-reminder:<roundId>:<key>`, one per lead time.

const PREFIX = "interview-reminder"

/** Lead times before the round start, in ms. */
const OFFSETS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "1h": 60 * 60 * 1000
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

async function remindersEnabled(): Promise<boolean> {
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
 * on and the round has a future date+time) create `-24h` and `-1h` alarms,
 * skipping any lead time already in the past.
 */
export async function syncRoundAlarms(round: InterviewRound): Promise<void> {
  await clearRoundAlarms(round.id)
  if (!(await remindersEnabled())) return

  const start = roundStartMs(round)
  if (start == null) return

  const now = Date.now()
  for (const [key, offset] of Object.entries(OFFSETS)) {
    const when = start - offset
    if (when > now) chrome.alarms.create(alarmName(round.id, key), { when })
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

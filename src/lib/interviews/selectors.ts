import type {
  InterviewRound,
  RoundFormat,
  RoundType,
  SavedApplication
} from "~types/userProfile"

export interface RoundRef {
  app: SavedApplication
  round: InterviewRound
}

export interface DayGroup {
  /** "YYYY-MM-DD" */
  day: string
  /** Human label, e.g. "Today", "Tomorrow", "Wed · Jun 12". */
  label: string
  rounds: RoundRef[]
}

const ROUND_TYPE_LABEL: Record<RoundType, string> = {
  HR: "HR Interview",
  Technical: "Technical Interview",
  Final: "Final Interview",
  Custom: "Interview"
}

export function roundLabel(round: InterviewRound): string {
  if (round.type === "Custom") return round.customLabel?.trim() || "Interview"
  return ROUND_TYPE_LABEL[round.type]
}

/** Short tag shown on agenda rows / notifications. */
export function roundTypeTag(round: InterviewRound): string {
  if (round.type === "Custom") return round.customLabel?.trim() || "Custom"
  return round.type
}

const ROUND_FORMAT_LABEL: Record<RoundFormat, string> = {
  phone: "Phone call",
  video: "Video call",
  onsite: "On-site"
}

export function formatLabel(format?: RoundFormat): string {
  return format ? ROUND_FORMAT_LABEL[format] : ""
}

// ── date helpers (local-day, never construct Date from a bare "YYYY-MM-DD") ────

/** Local calendar day as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** "YYYY-MM-DD" shifted by `days`, computed on the local calendar. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return todayISO(dt)
}

/** Whole calendar days from today to `dateISO` (negative = past). */
export function daysUntil(dateISO: string, now: Date = new Date()): number {
  const [ty, tm, td] = todayISO(now).split("-").map(Number)
  const [y, m, d] = dateISO.split("-").map(Number)
  const a = Date.UTC(ty, tm - 1, td)
  const b = Date.UTC(y, m - 1, d)
  return Math.round((b - a) / 86_400_000)
}

/** "in 2 days" / "tomorrow" / "today" / "3 days ago" for a "YYYY-MM-DD". */
export function relativeDayLabel(
  dateISO: string,
  now: Date = new Date()
): string {
  const n = daysUntil(dateISO, now)
  if (n === 0) return "today"
  if (n === 1) return "tomorrow"
  if (n === -1) return "yesterday"
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

/** Local epoch ms for a round's start, or null when date/time is incomplete. */
export function roundStartMs(round: InterviewRound): number | null {
  if (!round.date || !round.time) return null
  const [y, m, d] = round.date.split("-").map(Number)
  const [hh, mm] = round.time.split(":").map(Number)
  if ([y, m, d, hh, mm].some((v) => Number.isNaN(v))) return null
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
}

const timeKey = (r: InterviewRound) => r.time ?? "99:99"

/** Chronological order: date asc, then time asc (time-TBD last within a day). */
export function compareRounds(a: RoundRef, b: RoundRef): number {
  const da = a.round.date ?? ""
  const db = b.round.date ?? ""
  if (da !== db) return da < db ? -1 : 1
  return timeKey(a.round).localeCompare(timeKey(b.round))
}

// ── collection selectors ─────────────────────────────────────────────────────

export function roundsWithApp(apps: SavedApplication[]): RoundRef[] {
  const out: RoundRef[] = []
  for (const app of apps) {
    for (const round of app.rounds ?? []) out.push({ app, round })
  }
  return out
}

/**
 * The application's single in-progress round, if any: a real (non-synthesized)
 * round that has not been debriefed to completion. An application may have at
 * most one of these at a time.
 */
export function openRound(app: SavedApplication): InterviewRound | undefined {
  return (app.rounds ?? []).find((r) => !r.synthesized && !r.debrief?.loggedAt)
}

export function hasOpenRound(app: SavedApplication): boolean {
  return openRound(app) !== undefined
}

/** Does this round have any generated prep content yet? */
export function prepReady(round: InterviewRound): boolean {
  const p = round.prep
  return !!(
    p &&
    (p.companyResearch || p.likelyTopics?.length || p.talkingPoints?.length)
  )
}

/**
 * A round with no user-entered content beyond its type — i.e. the bare stub
 * auto-created when an application enters "Interviewing". Safe to remove when
 * the status is rolled back.
 */
export function isPristineRound(r: InterviewRound): boolean {
  return (
    !r.date &&
    !r.time &&
    !r.format &&
    !r.interviewers &&
    !r.prep &&
    !r.debrief &&
    r.type !== "Custom"
  )
}

export function scheduled(list: RoundRef[]): RoundRef[] {
  return list.filter((r) => !!r.round.date)
}

export function unscheduled(list: RoundRef[]): RoundRef[] {
  return list.filter((r) => !r.round.date).sort(compareRounds)
}

export function upcoming(list: RoundRef[], now: Date = new Date()): RoundRef[] {
  const today = todayISO(now)
  return list
    .filter((r) => r.round.date && r.round.date >= today)
    .sort(compareRounds)
}

export function past(list: RoundRef[], now: Date = new Date()): RoundRef[] {
  const today = todayISO(now)
  return list
    .filter((r) => r.round.date && r.round.date < today)
    .sort(compareRounds)
    .reverse() // most recent first
}

/** Scheduled rounds within the next 7 days (inclusive of today). */
export function roundsThisWeek(
  list: RoundRef[],
  now: Date = new Date()
): RoundRef[] {
  const today = todayISO(now)
  const horizon = addDaysISO(today, 7)
  return list
    .filter(
      (r) => r.round.date && r.round.date >= today && r.round.date <= horizon
    )
    .sort(compareRounds)
}

/** Past, non-synthesized rounds with no logged debrief. */
export function needsDebrief(
  list: RoundRef[],
  now: Date = new Date()
): RoundRef[] {
  return past(list, now).filter(
    (r) => !r.round.synthesized && !r.round.debrief?.loggedAt
  )
}

export function nextRound(
  list: RoundRef[],
  now: Date = new Date()
): RoundRef | undefined {
  return upcoming(list, now)[0]
}

/** Group a (typically `upcoming`) list into day buckets, chronological. */
export function groupByDay(
  list: RoundRef[],
  now: Date = new Date()
): DayGroup[] {
  const today = todayISO(now)
  const tomorrow = addDaysISO(today, 1)
  const byDay = new Map<string, RoundRef[]>()

  for (const ref of [...list].sort(compareRounds)) {
    const day = ref.round.date
    if (!day) continue
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(ref)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, rounds]) => ({
      day,
      label: dayLabel(day, today, tomorrow),
      rounds
    }))
}

function dayLabel(day: string, today: string, tomorrow: string): string {
  if (day === today) return "Today"
  if (day === tomorrow) return "Tomorrow"
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  })
}

import type {
  InterviewRound,
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

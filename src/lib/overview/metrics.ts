import {
  daysUntil,
  roundsWithApp,
  todayISO,
  type RoundRef
} from "~lib/interviews/selectors"
import type {
  ApplicationStatus,
  DebriefOutcome,
  RoundType,
  SavedApplication
} from "~types/userProfile"

/**
 * Pure derivations behind Applications → Overview. Everything here reads a
 * `SavedApplication[]` and returns plain data — no storage, no React, no
 * formatting decisions beyond bucket labels.
 *
 * Two rules the whole file follows:
 *
 * 1. **Stages are "ever reached", not "currently in".** An application that
 *    went Applied → Reject still counts as applied. Counting by current
 *    status alone (what the first Overview did) silently understates every
 *    conversion rate, because losses leave the funnel entirely.
 * 2. **Percentages need a sample.** A rate over three applications swings by
 *    33 points per event and invites the wrong conclusion, so rates below
 *    `MIN_APPS_FOR_RATES` are returned as `null` for the UI to render as "—".
 */

/** Below this many observations a percentage is noise, not a signal. */
export const MIN_APPS_FOR_RATES = 5

/** Match bands are narrower by nature, so they unlock earlier. */
export const MIN_BAND_SAMPLE = 3

/** Replies needed before a median reply time means anything. */
export const MIN_REPLIES_FOR_TIMING = 3

export interface Rate {
  /** Percent 0–100, or null when the sample is too small to show. */
  value: number | null
  /** Numerator — how many cleared the bar. */
  hits: number
  /** Denominator — the sample the rate was taken over. */
  sample: number
  /** Sample size that would unlock the rate (for the "needs N more" copy). */
  needed: number
}

// ── stage predicates ─────────────────────────────────────────────────────────

/** Applied at some point: anything that left the `Saved` state. */
export function everApplied(app: SavedApplication): boolean {
  return app.status !== "Saved"
}

/**
 * Reached an interview at some point. Rounds are the strongest evidence —
 * including `synthesized` ones, which the migration created precisely because
 * the application had once been marked as interviewing.
 */
export function everInterviewed(app: SavedApplication): boolean {
  if ((app.rounds ?? []).length > 0) return true
  return app.status === "Interviewing" || app.status === "Offer"
}

/**
 * Heard back at all — decided purely by status: `Interviewing`, `Offer` or
 * `Reject`. A rejection is a reply; anything still sitting in `Applied` is
 * silence.
 *
 * Deliberately status-only, unlike `everInterviewed`: a round can be pencilled
 * in against an application whose status has not moved, and the status is the
 * field the user actually curates. It also keeps the numerator inside the
 * denominator, since all three statuses imply the application was sent.
 */
export function everReplied(app: SavedApplication): boolean {
  return (
    app.status === "Interviewing" ||
    app.status === "Offer" ||
    app.status === "Reject"
  )
}

export interface StageCounts {
  tracked: number
  applied: number
  interviewed: number
  offers: number
  rejected: number
  /** Applied, no reply yet. */
  awaiting: number
  replied: number
}

export function stageCounts(apps: SavedApplication[]): StageCounts {
  let applied = 0
  let interviewed = 0
  let offers = 0
  let rejected = 0
  let replied = 0

  for (const app of apps) {
    if (everApplied(app)) applied++
    if (everInterviewed(app)) interviewed++
    if (app.status === "Offer") offers++
    if (app.status === "Reject") rejected++
    if (everReplied(app)) replied++
  }

  return {
    tracked: apps.length,
    applied,
    interviewed,
    offers,
    rejected,
    awaiting: applied - replied,
    replied
  }
}

/** A rate that hides itself until the sample is big enough to trust. */
export function rate(
  hits: number,
  sample: number,
  needed: number = MIN_APPS_FOR_RATES
): Rate {
  const enough = sample >= needed && sample > 0
  return {
    value: enough ? Math.round((hits / sample) * 100) : null,
    hits,
    sample,
    needed
  }
}

// ── dates ────────────────────────────────────────────────────────────────────

/** Local calendar day for an ISO timestamp, as "YYYY-MM-DD". */
function dayOfISO(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : todayISO(d)
}

/** The day an application was sent (falls back to when it was created). */
export function appliedDay(app: SavedApplication): string | null {
  if (app.date) return app.date.slice(0, 10)
  return dayOfISO(app.createdAt)
}

/** The day its status last moved (falls back to creation). */
export function lastMoveDay(app: SavedApplication): string | null {
  return dayOfISO(app.statusUpdatedAt ?? app.createdAt)
}

/** Whole days between two "YYYY-MM-DD" days, or null if either is missing. */
export function daysBetween(
  from?: string | null,
  to?: string | null
): number | null {
  if (!from || !to) return null
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  if ([fy, fm, fd, ty, tm, td].some((n) => Number.isNaN(n))) return null
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000
  )
}

/** Days elapsed since a "YYYY-MM-DD", never negative. */
export function daysSince(
  day?: string | null,
  now: Date = new Date()
): number | null {
  if (!day) return null
  const n = daysUntil(day, now)
  return Number.isNaN(n) ? null : Math.max(0, -n)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export interface TimingStats {
  /** Median days from applying to the first reply, over what recorded one. */
  medianDaysToReply: number | null
  /** How many replies that median is based on. */
  replySample: number
  /** Longest wait among applications still with no answer. */
  oldestWaitingDays: number | null
  /** Average days the applications currently in each stage have sat there. */
  dwellByStage: { status: ApplicationStatus; count: number; avgDays: number }[]
}

const DWELL_ORDER: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Interviewing",
  "Offer"
]

export function timingStats(
  apps: SavedApplication[],
  now: Date = new Date()
): TimingStats {
  const replyDays: number[] = []
  let oldestWaiting: number | null = null
  const dwell = new Map<ApplicationStatus, number[]>()

  for (const app of apps) {
    if (everReplied(app)) {
      // `firstReplyAt` only, never `statusUpdatedAt`: the latter advances with
      // every later move, so an Applied → Interviewing → Offer application
      // would report the offer date as its reply time. Applications answered
      // before that field existed simply sit this metric out.
      const days = daysBetween(appliedDay(app), dayOfISO(app.firstReplyAt))
      // A same-day or backdated move tells us nothing about response time.
      if (days !== null && days > 0) replyDays.push(days)
    } else if (app.status === "Applied") {
      const waiting = daysSince(appliedDay(app), now)
      if (
        waiting !== null &&
        (oldestWaiting === null || waiting > oldestWaiting)
      ) {
        oldestWaiting = waiting
      }
    }

    const sitting = daysSince(lastMoveDay(app), now)
    if (sitting !== null) {
      const bucket = dwell.get(app.status) ?? []
      bucket.push(sitting)
      dwell.set(app.status, bucket)
    }
  }

  return {
    medianDaysToReply:
      replyDays.length >= MIN_REPLIES_FOR_TIMING ? median(replyDays) : null,
    replySample: replyDays.length,
    oldestWaitingDays: oldestWaiting,
    dwellByStage: DWELL_ORDER.filter(
      (s) => (dwell.get(s) ?? []).length > 0
    ).map((status) => {
      const days = dwell.get(status)!
      return {
        status,
        count: days.length,
        avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length)
      }
    })
  }
}

/**
 * Applications sent in the last 30 days against the 30 before that.
 *
 * Only volume gets a delta. A *rate* delta would need the pipeline's state as
 * it stood a month ago, and storage keeps one timestamp per application — so
 * "response rate up 6 points" could only be guessed, and is left unsaid.
 */
export function volumeDelta(
  apps: SavedApplication[],
  now: Date = new Date()
): { current: number; previous: number; delta: number } {
  let current = 0
  let previous = 0

  for (const app of apps) {
    if (!everApplied(app)) continue
    const age = daysSince(appliedDay(app), now)
    if (age === null) continue
    if (age < 30) current++
    else if (age < 60) previous++
  }

  return { current, previous, delta: current - previous }
}

// ── match score vs. outcome ──────────────────────────────────────────────────

export interface MatchBand {
  label: string
  /** Inclusive lower bound of the band. */
  min: number
  count: number
  interviewed: number
  interviewRate: Rate
}

const BANDS: { label: string; min: number }[] = [
  { label: "85–100%", min: 85 },
  { label: "75–84%", min: 75 },
  { label: "65–74%", min: 65 },
  { label: "Below 65%", min: 0 }
]

/**
 * Interview rate per match-score band — the one view that says whether the
 * score the extension computes actually predicts anything.
 */
export function matchBands(apps: SavedApplication[]): MatchBand[] {
  const scored = apps.filter(
    (a) => typeof a.matchPercentage === "number" && everApplied(a)
  )

  return BANDS.map(({ label, min }) => {
    const ceiling = nextBandFloor(min)
    const inBand = scored.filter((a) => {
      const score = a.matchPercentage as number
      return score >= min && score < ceiling
    })
    const interviewed = inBand.filter(everInterviewed).length
    return {
      label,
      min,
      count: inBand.length,
      interviewed,
      interviewRate: rate(interviewed, inBand.length, MIN_BAND_SAMPLE)
    }
  })
}

/** The floor of the band above `min` — i.e. this band's exclusive ceiling. */
function nextBandFloor(min: number): number {
  const above = BANDS.filter((b) => b.min > min).map((b) => b.min)
  return above.length ? Math.min(...above) : Number.POSITIVE_INFINITY
}

/** Average match score across everything that has one. */
export function avgMatch(apps: SavedApplication[]): number | null {
  const scores = apps
    .map((a) => a.matchPercentage)
    .filter((n): n is number => typeof n === "number")
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// ── activity over time ───────────────────────────────────────────────────────

export type ActivityRange = "8w" | "6m" | "12m"

export interface ActivityBucket {
  /** Sort/lookup key — "YYYY-MM-DD" (week start) or "YYYY-MM" (month). */
  key: string
  label: string
  total: number
  /** Of `total`, how many have since heard back. */
  replied: number
  /** True for the bucket the current day falls in — it is still filling up. */
  partial: boolean
}

function mondayOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = date.getDay()
  date.setDate(date.getDate() - weekday + (weekday === 0 ? -6 : 1))
  return todayISO(date)
}

function shortDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })
}

function shortMonth(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" })
}

export function activityBuckets(
  apps: SavedApplication[],
  range: ActivityRange = "8w",
  now: Date = new Date()
): ActivityBucket[] {
  const today = todayISO(now)
  const buckets: ActivityBucket[] = []
  const index = new Map<string, ActivityBucket>()

  if (range === "8w") {
    const thisMonday = mondayOf(today)
    for (let i = 7; i >= 0; i--) {
      const [y, m, d] = thisMonday.split("-").map(Number)
      const start = new Date(y, m - 1, d - i * 7)
      const key = todayISO(start)
      const bucket = {
        key,
        label: shortDay(key),
        total: 0,
        replied: 0,
        partial: i === 0
      }
      buckets.push(bucket)
      index.set(key, bucket)
    }
  } else {
    const months = range === "6m" ? 6 : 12
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
      const bucket = {
        key,
        label: shortMonth(key),
        total: 0,
        replied: 0,
        partial: i === 0
      }
      buckets.push(bucket)
      index.set(key, bucket)
    }
  }

  for (const app of apps) {
    const day = appliedDay(app)
    if (!day) continue
    const key = range === "8w" ? mondayOf(day) : day.slice(0, 7)
    const bucket = index.get(key)
    if (!bucket) continue
    bucket.total++
    if (everReplied(app)) bucket.replied++
  }

  return buckets
}

// ── interview performance (from debriefs) ────────────────────────────────────

export interface DebriefStats {
  /** Rounds with a logged debrief. */
  logged: number
  rated: number
  avgRating: number | null
  /** Recent average minus earlier average, when there are enough of both. */
  trendDelta: number | null
  byType: {
    type: RoundType
    label: string
    rounds: number
    avgRating: number | null
  }[]
  outcomes: { outcome: DebriefOutcome; count: number }[]
}

const OUTCOME_ORDER: DebriefOutcome[] = [
  "advance",
  "offer",
  "reject",
  "waiting"
]

const ROUND_TYPE_ORDER: RoundType[] = ["HR", "Technical", "Final", "Custom"]

const ROUND_TYPE_LABEL: Record<RoundType, string> = {
  HR: "HR screen",
  Technical: "Technical",
  Final: "Final",
  Custom: "Other"
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null

export function debriefStats(apps: SavedApplication[]): DebriefStats {
  const refs = roundsWithApp(apps).filter((r) => !!r.round.debrief?.loggedAt)
  const chronological = [...refs].sort((a, b) =>
    (a.round.debrief!.loggedAt ?? "").localeCompare(
      b.round.debrief!.loggedAt ?? ""
    )
  )

  const ratings = chronological
    .map((r) => r.round.debrief?.rating)
    .filter((n): n is 1 | 2 | 3 | 4 | 5 => typeof n === "number")

  // "Getting better?" needs two halves to compare — five recent against
  // everything before them, and only once there is something before them.
  const recent = ratings.slice(-5)
  const earlier = ratings.slice(0, -5)
  const recentAvg = mean(recent)
  const earlierAvg = mean(earlier)
  const trendDelta =
    earlier.length >= 2 && recentAvg !== null && earlierAvg !== null
      ? Math.round((recentAvg - earlierAvg) * 10) / 10
      : null

  const byType = ROUND_TYPE_ORDER.map((type) => {
    const ofType = refs.filter((r) => r.round.type === type)
    const typeRatings = ofType
      .map((r) => r.round.debrief?.rating)
      .filter((n): n is 1 | 2 | 3 | 4 | 5 => typeof n === "number")
    const avg = mean(typeRatings)
    return {
      type,
      label: ROUND_TYPE_LABEL[type],
      rounds: ofType.length,
      avgRating: avg === null ? null : Math.round(avg * 10) / 10
    }
  }).filter((t) => t.rounds > 0)

  const outcomes = OUTCOME_ORDER.map((outcome) => ({
    outcome,
    count: refs.filter((r) => r.round.debrief?.outcome === outcome).length
  })).filter((o) => o.count > 0)

  const avg = mean(ratings)

  return {
    logged: refs.length,
    rated: ratings.length,
    avgRating: avg === null ? null : Math.round(avg * 10) / 10,
    trendDelta,
    byType,
    outcomes
  }
}

/** Every debriefed round, most recent first — shared by the cards above. */
export function debriefedRounds(apps: SavedApplication[]): RoundRef[] {
  return roundsWithApp(apps)
    .filter((r) => !!r.round.debrief?.loggedAt)
    .sort((a, b) =>
      (b.round.debrief!.loggedAt ?? "").localeCompare(
        a.round.debrief!.loggedAt ?? ""
      )
    )
}

// ── where applications come from ─────────────────────────────────────────────

export interface SourceRow {
  key: string
  label: string
  /** Hostname, host count, or the "not recorded" hint, shown under the label. */
  detail: string
  /** Distinct hostnames folded into this row, alphabetical. */
  hosts: string[]
  applied: number
  replied: number
  interviewed: number
  offers: number
  replyRate: Rate
  interviewRate: Rate
}

const KNOWN_SOURCES: { match: RegExp; key: string; label: string }[] = [
  { match: /(^|\.)linkedin\./, key: "linkedin", label: "LinkedIn" },
  { match: /(^|\.)indeed\./, key: "indeed", label: "Indeed" },
  { match: /(^|\.)glassdoor\./, key: "glassdoor", label: "Glassdoor" },
  {
    match: /(^|\.)(lever|greenhouse|workable|ashbyhq)\./,
    key: "ats",
    label: "ATS page"
  },
  {
    match: /(^|\.)(xing|stepstone|welcometothejungle)\./,
    key: "boards",
    label: "Job board"
  }
]

function sourceOf(app: SavedApplication): {
  key: string
  label: string
  host: string
} {
  if (!app.jobUrl) {
    return { key: "none", label: "Not recorded", host: "" }
  }
  let host: string
  try {
    host = new URL(app.jobUrl).hostname.replace(/^www\./, "")
  } catch {
    return { key: "none", label: "Not recorded", host: "" }
  }
  const known = KNOWN_SOURCES.find((s) => s.match.test(host))
  if (known) return { key: known.key, label: known.label, host }
  // Everything that is not a board or an ATS is someone's own careers page.
  // Kept as one category: "applying direct" is the comparison worth making,
  // and a row per employer domain is a list of companies, not of sources.
  return { key: "company", label: "Company site", host }
}

/** Sub-label for a row: the single host, or how many were folded into it. */
function sourceDetail(key: string, hosts: string[]): string {
  if (key === "none") return "no job URL saved"
  if (hosts.length === 1) return hosts[0]
  // Counts hostnames, not employers — careers.acme.com and acme.com are two
  // hosts for one company, so the wording stays about sites.
  return key === "company" ? `${hosts.length} sites` : `${hosts.length} domains`
}

/** Applied-only breakdown by where the posting came from, busiest first. */
export function sourceBreakdown(apps: SavedApplication[]): SourceRow[] {
  const rows = new Map<string, SourceRow>()
  const hosts = new Map<string, Set<string>>()

  for (const app of apps) {
    if (!everApplied(app)) continue
    const { key, label, host } = sourceOf(app)
    const row =
      rows.get(key) ??
      ({
        key,
        label,
        detail: "",
        hosts: [],
        applied: 0,
        replied: 0,
        interviewed: 0,
        offers: 0,
        replyRate: rate(0, 0),
        interviewRate: rate(0, 0)
      } satisfies SourceRow)
    row.applied++
    if (everReplied(app)) row.replied++
    if (everInterviewed(app)) row.interviewed++
    if (app.status === "Offer") row.offers++
    rows.set(key, row)

    const seen = hosts.get(key) ?? new Set<string>()
    if (host) seen.add(host)
    hosts.set(key, seen)
  }

  return (
    [...rows.values()]
      .map((row) => {
        const seen = [...(hosts.get(row.key) ?? [])].sort()
        return {
          ...row,
          hosts: seen,
          detail: sourceDetail(row.key, seen),
          replyRate: rate(row.replied, row.applied),
          interviewRate: rate(row.interviewed, row.applied)
        }
      })
      // Busiest first, but applications with no URL always sit last — they are
      // a data gap, not a source worth comparing against.
      .sort((a, b) => {
        if (a.key === "none") return 1
        if (b.key === "none") return -1
        return b.applied - a.applied
      })
  )
}

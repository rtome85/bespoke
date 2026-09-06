import { useMemo } from "react"

import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type SavedApplication
} from "~types/userProfile"

interface Props {
  applications: SavedApplication[]
  onOpen: (app: SavedApplication) => void
}

const RESPONDED: ApplicationStatus[] = [
  "HR Interview",
  "1st Technical Interview",
  "2nd Technical Interview",
  "Final Interview",
  "Offer",
  "Reject"
]

const INTERVIEW: ApplicationStatus[] = [
  "HR Interview",
  "1st Technical Interview",
  "2nd Technical Interview",
  "Final Interview"
]

const TERMINAL: ApplicationStatus[] = ["Offer", "Reject"]

const STALE_DAYS = 14

function parseDay(raw?: string): Date | null {
  if (!raw) return null
  const s = raw.slice(0, 10).split("-")
  const d = new Date(Number(s[0]), Number(s[1]) - 1, Number(s[2]))
  return isNaN(d.getTime()) ? null : d
}

function mondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function daysSince(iso?: string): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}

const card = "bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6"
const cardHead = "text-[13px] font-semibold text-aa-text-primary"
const cardSub = "text-[12px] text-aa-text-secondary mt-0.5"

export function ApplicationsOverview({ applications, onOpen }: Props) {
  const derived = useMemo(() => {
    const counts = new Map<ApplicationStatus, number>()
    APPLICATION_STATUSES.forEach((s) => counts.set(s, 0))
    applications.forEach((a) =>
      counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
    )

    const total = applications.length
    const saved = counts.get("Saved") ?? 0
    const applied = total - saved
    const responded = RESPONDED.reduce((n, s) => n + (counts.get(s) ?? 0), 0)
    const interviews = INTERVIEW.reduce((n, s) => n + (counts.get(s) ?? 0), 0)
    const offers = counts.get("Offer") ?? 0

    const scores = applications
      .map((a) => a.matchPercentage)
      .filter((m): m is number => typeof m === "number")
    const avgMatch = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null

    // Weekly buckets over the last 8 weeks
    const now = new Date()
    const firstMonday = mondayOf(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * 7)
    )
    const weeks: { label: string; count: number }[] = []
    for (let i = 0; i < 8; i++) {
      const start = new Date(firstMonday)
      start.setDate(firstMonday.getDate() + i * 7)
      weeks.push({ label: shortDate(start), count: 0 })
    }
    applications.forEach((a) => {
      const d = parseDay(a.date) ?? parseDay(a.createdAt)
      if (!d) return
      const idx = Math.floor(
        (mondayOf(d).getTime() - firstMonday.getTime()) / (7 * 86_400_000)
      )
      if (idx >= 0 && idx < 8) weeks[idx].count++
    })

    // Cumulative funnel (Saved → … → Offer), plus Reject as a side bar
    const funnelStages = APPLICATION_STATUSES.filter((s) => s !== "Reject")
    const cumulative = new Map<ApplicationStatus, number>()
    let running = 0
    for (let i = funnelStages.length - 1; i >= 0; i--) {
      running += counts.get(funnelStages[i]) ?? 0
      cumulative.set(funnelStages[i], running)
    }
    const rejects = counts.get("Reject") ?? 0

    // Needs attention
    const stale = applications
      .filter(
        (a) =>
          !TERMINAL.includes(a.status) &&
          (daysSince(a.statusUpdatedAt ?? a.createdAt) ?? 0) >= STALE_DAYS
      )
      .sort(
        (a, b) =>
          (daysSince(b.statusUpdatedAt ?? b.createdAt) ?? 0) -
          (daysSince(a.statusUpdatedAt ?? a.createdAt) ?? 0)
      )
    const neverApplied = applications.filter((a) => a.status === "Saved")
    const recentRejections = applications
      .filter(
        (a) => a.status === "Reject" && (daysSince(a.statusUpdatedAt) ?? 99) <= 30
      )
      .sort(
        (a, b) =>
          (daysSince(a.statusUpdatedAt) ?? 99) -
          (daysSince(b.statusUpdatedAt) ?? 99)
      )

    return {
      counts,
      total,
      applied,
      responded,
      interviews,
      offers,
      avgMatch,
      weeks,
      funnelStages,
      cumulative,
      rejects,
      stale,
      neverApplied,
      recentRejections
    }
  }, [applications])

  if (applications.length === 0) {
    return (
      <div className={`${card} text-center py-16`}>
        <p className="text-[14px] font-semibold text-aa-text-primary">
          Nothing to chart yet
        </p>
        <p className="text-[13px] text-aa-text-secondary mt-1">
          Track a few applications and this fills in — pipeline, response rate,
          and what needs a nudge.
        </p>
      </div>
    )
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
  const stats = [
    { label: "Tracked", value: derived.total },
    { label: "Response rate", value: `${pct(derived.responded, derived.applied)}%` },
    {
      label: "Interview rate",
      value: `${pct(derived.interviews, derived.applied)}%`
    },
    { label: "Offers", value: derived.offers },
    {
      label: "Avg match",
      value: derived.avgMatch === null ? "—" : `${derived.avgMatch}%`
    }
  ]

  const maxFunnel = Math.max(
    derived.cumulative.get(derived.funnelStages[0]) ?? 0,
    derived.rejects,
    1
  )
  const maxWeek = Math.max(...derived.weeks.map((w) => w.count), 1)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={card}>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary">
              {s.label}
            </span>
            <span className="block text-[28px] font-bold text-aa-text-primary leading-none mt-2">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className={card}>
        <h3 className={cardHead}>Pipeline</h3>
        <p className={cardSub}>Applications still live at each stage.</p>
        <hr className="border-0 border-t border-aa-border my-4" />
        <div>
          {derived.funnelStages.map((stage, i) => {
            const count = derived.cumulative.get(stage) ?? 0
            const prev =
              i > 0 ? derived.cumulative.get(derived.funnelStages[i - 1]) ?? 0 : null
            const conv =
              prev && prev > 0 ? Math.round((count / prev) * 100) : null
            const on = count > 0
            return (
              <div
                key={stage}
                className="flex items-center gap-3 py-2.5 border-b border-aa-border last:border-0">
                <span
                  className={`text-[12px] w-[168px] shrink-0 ${
                    on ? "text-aa-text-primary font-medium" : "text-aa-text-secondary"
                  }`}>
                  {stage}
                </span>
                <div className="flex-1 h-2 rounded-aa-pill bg-aa-primary-soft overflow-hidden">
                  {on && (
                    <div
                      className="h-full bg-aa-primary"
                      style={{ width: `${(count / maxFunnel) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-[11px] text-aa-text-secondary w-10 text-right tabular-nums">
                  {conv === null ? "" : `${conv}%`}
                </span>
                <span
                  className={`text-[13px] font-bold w-6 text-right tabular-nums ${
                    on ? "text-aa-text-primary" : "text-aa-neutral-400"
                  }`}>
                  {count}
                </span>
              </div>
            )
          })}
          {derived.rejects > 0 && (
            <div className="flex items-center gap-3 py-2.5">
              <span className="text-[12px] w-[168px] shrink-0 text-aa-error-strong font-medium">
                Rejected
              </span>
              <div className="flex-1 h-2 rounded-aa-pill bg-aa-error-soft overflow-hidden">
                <div
                  className="h-full bg-aa-error-strong"
                  style={{ width: `${(derived.rejects / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="w-10" />
              <span className="text-[13px] font-bold w-6 text-right tabular-nums text-aa-text-primary">
                {derived.rejects}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Applications by week */}
      <div className={card}>
        <h3 className={cardHead}>Activity</h3>
        <p className={cardSub}>Applications tracked per week, last 8 weeks.</p>
        <hr className="border-0 border-t border-aa-border my-4" />
        <div className="flex items-end gap-2 h-36">
          {derived.weeks.map((w, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group">
              <span className="text-[11px] font-semibold text-aa-text-secondary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {w.count}
              </span>
              <div
                className="w-full rounded-aa-sm bg-aa-primary group-hover:bg-aa-primary-hover transition-colors"
                style={{ height: `${Math.max((w.count / maxWeek) * 100, 3)}%` }}
              />
              <span className="text-[10px] text-aa-text-secondary mt-1.5">
                {w.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Needs attention */}
      <div className={card}>
        <h3 className={cardHead}>Needs attention</h3>
        <p className={cardSub}>
          Where the pipeline has gone quiet.
        </p>
        <hr className="border-0 border-t border-aa-border my-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AttentionList
            title={`Stale · ${STALE_DAYS}+ days`}
            empty="Everything's moved recently."
            apps={derived.stale}
            meta={(a) =>
              `${daysSince(a.statusUpdatedAt ?? a.createdAt)}d in ${a.status}`
            }
            onOpen={onOpen}
          />
          <AttentionList
            title="Saved, not applied"
            empty="No untouched saves."
            apps={derived.neverApplied}
            meta={(a) => {
              const d = daysSince(a.createdAt)
              return d === null ? "saved" : `saved ${d}d ago`
            }}
            onOpen={onOpen}
          />
          <AttentionList
            title="Recent rejections"
            empty="None in the last 30 days."
            apps={derived.recentRejections}
            meta={(a) => {
              const d = daysSince(a.statusUpdatedAt)
              return d === null ? "" : `${d}d ago`
            }}
            onOpen={onOpen}
          />
        </div>
      </div>
    </div>
  )
}

function AttentionList({
  title,
  empty,
  apps,
  meta,
  onOpen
}: {
  title: string
  empty: string
  apps: SavedApplication[]
  meta: (a: SavedApplication) => string
  onOpen: (a: SavedApplication) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-2">
        {title}
        {apps.length > 0 && (
          <span className="ml-1.5 text-aa-text-primary">{apps.length}</span>
        )}
      </p>
      {apps.length === 0 ? (
        <p className="text-[12px] text-aa-text-secondary">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {apps.slice(0, 6).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen(a)}
                className="w-full text-left group">
                <span className="block text-[12px] font-medium text-aa-text-primary truncate group-hover:text-aa-primary transition-colors">
                  {a.company}
                </span>
                <span className="block text-[11px] text-aa-text-secondary truncate">
                  {a.jobTitle} · {meta(a)}
                </span>
              </button>
            </li>
          ))}
          {apps.length > 6 && (
            <li className="text-[11px] text-aa-text-secondary">
              +{apps.length - 6} more
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

import { useMemo, useState } from "react"

import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type SavedApplication
} from "~types/userProfile"

interface Props {
  applications: SavedApplication[]
}

type Period = "daily" | "weekly" | "monthly"

const FUNNEL_COLORS: Record<string, string> = {
  Saved: "bg-accent",
  Applied: "bg-accent",
  "HR Interview": "bg-accent",
  "1st Technical Interview": "bg-accent",
  "2nd Technical Interview": "bg-accent",
  "Final Interview": "bg-accent",
  Offer: "bg-accent"
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function AnalyticsDashboard({ applications }: Props) {
  const [period, setPeriod] = useState<Period>("daily")

  const stats = useMemo(() => {
    const statusCounts = new Map<ApplicationStatus, number>()
    APPLICATION_STATUSES.forEach((s) => statusCounts.set(s, 0))
    applications.forEach((app) =>
      statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1)
    )

    const total = applications.length
    const savedCount = statusCounts.get("Saved") ?? 0
    const appliedCount = total - savedCount
    const appliedRate = total > 0 ? (appliedCount / total) * 100 : 0

    const respondedStatuses: ApplicationStatus[] = [
      "HR Interview",
      "1st Technical Interview",
      "2nd Technical Interview",
      "Final Interview",
      "Offer",
      "Reject"
    ]
    const respondedCount = respondedStatuses.reduce(
      (sum, s) => sum + (statusCounts.get(s) ?? 0),
      0
    )
    const responseRate =
      appliedCount > 0 ? (respondedCount / appliedCount) * 100 : 0

    const offerCount = statusCounts.get("Offer") ?? 0
    const offerRate = total > 0 ? (offerCount / total) * 100 : 0

    const matchScores = applications
      .map((a) => a.matchPercentage)
      .filter((m): m is number => m !== undefined)
    const avgMatch =
      matchScores.length > 0
        ? matchScores.reduce((a, b) => a + b, 0) / matchScores.length
        : null

    const tagMap = new Map<string, number>()
    applications.forEach((app) =>
      app.tags?.forEach((t) => tagMap.set(t, (tagMap.get(t) ?? 0) + 1))
    )
    const tagCounts = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const matchByStatus: { status: ApplicationStatus; avg: number }[] = []
    APPLICATION_STATUSES.forEach((s) => {
      const scores = applications
        .filter((a) => a.status === s && a.matchPercentage !== undefined)
        .map((a) => a.matchPercentage!)
      if (scores.length > 0) {
        matchByStatus.push({
          status: s,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length
        })
      }
    })

    return {
      statusCounts,
      total,
      appliedRate,
      responseRate,
      offerRate,
      avgMatch,
      tagCounts,
      matchByStatus
    }
  }, [applications])

  const activityData = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number }>()

    applications.forEach((app) => {
      const raw = app.date || app.createdAt
      if (!raw) return
      const parts = raw.slice(0, 10).split("-")
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      )
      if (isNaN(d.getTime())) return

      let key: string
      let label: string

      if (period === "daily") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        label = formatShortDate(d)
      } else if (period === "weekly") {
        const monday = getMonday(d)
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`
        label = formatShortDate(monday)
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec"
        ]
        label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
      }

      const existing = buckets.get(key)
      if (existing) {
        existing.count++
      } else {
        buckets.set(key, { label, count: 1 })
      }
    })

    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([, v]) => v)
  }, [applications, period])

  if (applications.length === 0) {
    return (
      <div className="bg-surface border-2 border-ink rounded-none p-16 text-center">
        <h3 className="font-heading text-base font-semibold text-ink">
          No applications yet
        </h3>
        <p className="font-body text-sm text-ink-muted mt-1">
          Start saving job applications to see your analytics here.
        </p>
      </div>
    )
  }

  const funnelStatuses = APPLICATION_STATUSES.filter((s) => s !== "Reject")
  const cumulativeCounts = new Map<ApplicationStatus, number>()
  let cumSum = 0
  for (let i = funnelStatuses.length - 1; i >= 0; i--) {
    cumSum += stats.statusCounts.get(funnelStatuses[i]) ?? 0
    cumulativeCounts.set(funnelStatuses[i], cumSum)
  }

  const rejectCount = stats.statusCounts.get("Reject") ?? 0
  const maxFunnelCount = Math.max(
    cumulativeCounts.get(funnelStatuses[0]) ?? 0,
    rejectCount,
    1
  )
  const maxBarCount = Math.max(...activityData.map((d) => d.count), 1)
  const maxTagCount = Math.max(...stats.tagCounts.map(([, c]) => c), 1)

  const kpis = [
    { label: "TOTAL", value: stats.total },
    { label: "APPLIED", value: `${stats.appliedRate.toFixed(0)}%` },
    { label: "RESPONSE", value: `${stats.responseRate.toFixed(0)}%` },
    {
      label: "AVG MATCH",
      value: stats.avgMatch !== null ? `${stats.avgMatch.toFixed(0)}%` : "N/A"
    },
    { label: "OFFER RATE", value: `${stats.offerRate.toFixed(0)}%` }
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex-1 bg-surface border-2 border-ink p-5">
            <span className="font-heading text-[10px] font-semibold tracking-widest text-ink-muted uppercase">
              {kpi.label}
            </span>
            <div className="font-heading text-[38px] font-bold text-ink leading-none mt-1.5">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border-2 border-ink p-6">
        <h3 className="font-heading text-xs font-bold tracking-widest text-ink uppercase">
          Pipeline Funnel
        </h3>
        <p className="font-body text-[13px] text-ink-muted mt-0.5">
          Application progression through stages
        </p>
        <div className="h-px bg-border-muted my-4" />

        <div className="space-y-0">
          {funnelStatuses.map((status, i) => {
            const cumCount = cumulativeCounts.get(status) ?? 0
            const width = (cumCount / maxFunnelCount) * 100
            const prevCumCount =
              i > 0 ? cumulativeCounts.get(funnelStatuses[i - 1]) ?? 0 : null
            const conversion =
              prevCumCount !== null && prevCumCount > 0
                ? ((cumCount / prevCumCount) * 100).toFixed(0)
                : null
            const hasValue = cumCount > 0

            return (
              <div
                key={status}
                className="flex items-center gap-3 py-3 border-b border-border-muted last:border-b-0">
                <span
                  className={`font-heading text-[13px] font-medium w-[180px] ${hasValue ? "text-ink" : "text-ink-muted"}`}>
                  {status}
                </span>
                <div className="flex-1 h-[10px] bg-accent-light relative">
                  {hasValue && (
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${width}%` }}
                    />
                  )}
                </div>
                <span
                  className={`font-heading text-[13px] font-bold w-8 text-right ${hasValue ? "text-ink" : "text-ink-subtle"}`}>
                  {cumCount}
                </span>
              </div>
            )
          })}
          {rejectCount > 0 && (
            <div className="flex items-center gap-3 py-3">
              <span className="font-heading text-[13px] font-medium w-[180px] text-red-500">
                Reject
              </span>
              <div className="flex-1 h-[10px] bg-accent-light relative">
                <div
                  className="h-full bg-red-400"
                  style={{ width: `${(rejectCount / maxFunnelCount) * 100}%` }}
                />
              </div>
              <span className="font-heading text-[13px] font-bold w-8 text-right text-ink">
                {rejectCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-surface border-2 border-ink p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-xs font-bold tracking-widest text-ink uppercase">
                Activity
              </h3>
              <p className="font-body text-[13px] text-ink-muted mt-0.5">
                Applications over time
              </p>
            </div>
            <div className="flex gap-0">
              {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`font-heading text-[10px] font-semibold tracking-wide px-4 py-2 ${
                    period === p
                      ? "bg-ink text-surface"
                      : "text-ink-muted border border-border-muted"
                  }`}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {activityData.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {activityData.map((d, i) => {
                const height = Math.max((d.count / maxBarCount) * 100, 3)
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div
                      className="w-full bg-accent group-hover:bg-ink transition-colors relative"
                      style={{ height: `${height}%` }}>
                      <span className="absolute inset-0 flex items-center justify-center font-heading text-xs font-semibold text-surface opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.count}
                      </span>
                    </div>
                    <span className="font-body text-[10px] text-ink-muted mt-1.5">
                      {d.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center font-body text-sm text-ink-muted">
              No activity data
            </div>
          )}
        </div>

        <div className="col-span-2 bg-surface border-2 border-ink p-6">
          <h3 className="font-heading text-xs font-bold tracking-widest text-ink uppercase">
            Match Score
          </h3>
          <p className="font-body text-[13px] text-ink-muted mt-0.5 mb-4">
            Average match by stage
          </p>

          {stats.matchByStatus.length > 0 ? (
            <div className="space-y-4">
              {stats.matchByStatus.slice(0, 5).map(({ status, avg }) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="font-heading text-xs font-medium w-20 text-ink">
                    {status}
                  </span>
                  <div className="flex-1 h-2 bg-accent-light relative">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                  <span className="font-heading text-xs font-bold w-10 text-right text-ink">
                    {avg.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 font-body text-sm text-ink-muted">
              No match scores available
            </div>
          )}
        </div>
      </div>

      {stats.tagCounts.length > 0 && (
        <div className="bg-surface border-2 border-ink p-6">
          <h3 className="font-heading text-xs font-bold tracking-widest text-ink uppercase">
            Top Tags
          </h3>
          <p className="font-body text-[13px] text-ink-muted mt-0.5 mb-4">
            Most used application tags
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {stats.tagCounts.map(([tag, count]) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="font-body text-xs text-ink w-24 text-right truncate">
                  {tag}
                </span>
                <div className="flex-1 h-2 bg-accent-light relative">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${(count / maxTagCount) * 100}%` }}
                  />
                </div>
                <span className="font-heading text-xs font-semibold w-5 text-right text-ink">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

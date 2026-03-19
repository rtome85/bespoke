import { useMemo, useState } from "react"

import {
  Briefcase,
  Mail,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react"

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
  Saved: "bg-purple-300",
  Applied: "bg-purple-400",
  "HR Interview": "bg-purple-500",
  "1st Technical Interview": "bg-purple-500",
  "2nd Technical Interview": "bg-purple-600",
  "Final Interview": "bg-purple-700",
  Offer: "bg-emerald-500",
  Reject: "bg-red-400"
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
      // Use the user-entered application date (YYYY-MM-DD) as the primary
      // grouping field; fall back to createdAt only when date is absent.
      // Parse with explicit year/month/day to avoid UTC-vs-local timezone shift
      // that new Date("YYYY-MM-DD") causes.
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
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
      <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-50 mb-5">
          <Briefcase className="h-7 w-7 text-gray-300" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          No applications yet
        </h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Start saving job applications to see your analytics here.
        </p>
      </div>
    )
  }

  const funnelStatuses = APPLICATION_STATUSES.filter((s) => s !== "Reject")
  // Cumulative counts: apps that reached *at least* this stage.
  // An app at stage N has implicitly passed through all earlier stages.
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
  const maxTagCount = Math.max(
    ...stats.tagCounts.map(([, c]) => c),
    1
  )

  const kpis = [
    {
      label: "Total",
      value: stats.total,
      icon: Briefcase,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100"
    },
    {
      label: "Applied",
      value: `${stats.appliedRate.toFixed(0)}%`,
      icon: Mail,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    {
      label: "Response",
      value: `${stats.responseRate.toFixed(0)}%`,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100"
    },
    {
      label: "Avg Match",
      value: stats.avgMatch !== null ? `${stats.avgMatch.toFixed(0)}%` : "N/A",
      icon: Sparkles,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100"
    },
    {
      label: "Offer Rate",
      value: `${stats.offerRate.toFixed(0)}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    }
  ]

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white rounded-xl border ${kpi.border} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`${kpi.bg} rounded-lg p-1.5`}>
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-500">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Pipeline Funnel
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Application progression through stages
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          {funnelStatuses.map((status, i) => {
            const cumCount = cumulativeCounts.get(status) ?? 0
            const width = (cumCount / maxFunnelCount) * 100
            const prevCumCount =
              i > 0
                ? cumulativeCounts.get(funnelStatuses[i - 1]) ?? 0
                : null
            const conversion =
              prevCumCount !== null && prevCumCount > 0
                ? ((cumCount / prevCumCount) * 100).toFixed(0)
                : null

            return (
              <div key={status} className="group flex items-center gap-3">
                <div className="w-36 flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs font-medium text-gray-600">
                    {status}
                  </span>
                  {conversion !== null && (
                    <span className="text-[10px] tabular-nums text-gray-300 font-medium">
                      {conversion}%
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-gray-100/80 rounded h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded transition-all duration-500 ${FUNNEL_COLORS[status]}`}
                    style={{ width: `${Math.max(width, cumCount > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <span className="w-7 text-xs tabular-nums font-semibold text-gray-900 text-right">
                  {cumCount}
                </span>
              </div>
            )
          })}
          {rejectCount > 0 && (
            <>
              <div className="border-t border-dashed border-gray-200 my-1" />
              <div className="flex items-center gap-3">
                <div className="w-36 shrink-0">
                  <span className="text-xs font-medium text-red-500">
                    Reject
                  </span>
                </div>
                <div className="flex-1 bg-gray-100/80 rounded h-6 relative overflow-hidden">
                  <div
                    className="h-full rounded bg-red-400 transition-all duration-500"
                    style={{
                      width: `${Math.max((rejectCount / maxFunnelCount) * 100, 3)}%`
                    }}
                  />
                </div>
                <span className="w-7 text-xs tabular-nums font-semibold text-gray-900 text-right">
                  {rejectCount}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Activity Timeline + Match Score by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Activity Timeline — wider */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Activity
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Applications over time
              </p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${period === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                    }`}>
                  {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          {activityData.length > 0 ? (
            <div className="relative">
              {/* Y-axis gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="border-t border-gray-100 w-full" />
                ))}
              </div>
              <div className="relative flex items-end gap-1.5 h-44">
                {activityData.map((d, i) => {
                  const height = Math.max((d.count / maxBarCount) * 100, 3)
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end h-full group">
                      <span className="text-[10px] tabular-nums font-semibold text-gray-900 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.count}
                      </span>
                      <div
                        className="w-full bg-purple-500 rounded-t-sm transition-all duration-500 group-hover:bg-purple-600"
                        style={{ height: `${height}%` }}
                      />
                      <span
                        className={`text-[10px] text-gray-400 mt-2 ${period === "weekly"
                          ? "whitespace-nowrap -rotate-45 origin-top-center"
                          : ""
                          }`}>
                        {d.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400">
              No activity data
            </div>
          )}
        </div>

        {/* Match Score by Status — narrower */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-900">
              Match Score
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Average match by stage
            </p>
          </div>
          {stats.matchByStatus.length > 0 ? (
            <div className="space-y-3">
              {stats.matchByStatus.map(({ status, avg }) => {
                const color =
                  avg >= 70
                    ? "bg-emerald-500"
                    : avg >= 50
                      ? "bg-amber-400"
                      : "bg-red-400"
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{status}</span>
                      <span className="text-xs tabular-nums font-semibold text-gray-900">
                        {avg.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No match scores available
            </div>
          )}
        </div>
      </div>

      {/* Tags Breakdown */}
      {stats.tagCounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Top Tags
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Most used application tags
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {stats.tagCounts.map(([tag, count]) => (
              <div key={tag} className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-600 text-right shrink-0 truncate">
                  {tag}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-400 transition-all duration-500"
                    style={{ width: `${(count / maxTagCount) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-xs tabular-nums font-semibold text-gray-700 text-right">
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

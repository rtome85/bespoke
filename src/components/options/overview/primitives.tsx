import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

import type { Rate } from "~lib/overview/metrics"

/** Card shell shared by every Overview panel. */
export function OverviewCard({
  title,
  sub,
  action,
  children
}: {
  title: string
  sub?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="aa-card">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="aa-card-heading">{title}</h3>
          {sub ? <p className="aa-card-sub">{sub}</p> : null}
        </div>
        {action}
      </div>
      <hr className="border-0 border-t border-aa-border my-4" />
      {children}
    </section>
  )
}

/** A rate, or an em dash plus what it is still waiting for. */
export function RateValue({ rate }: { rate: Rate }) {
  if (rate.value === null) return <>—</>
  return <>{rate.value}%</>
}

/** The "needs N more" hint that replaces a hidden rate. */
export function rateHint(rate: Rate, noun = "applications"): string {
  if (rate.value !== null) return `${rate.hits} of ${rate.sample}`
  const missing = Math.max(1, rate.needed - rate.sample)
  return `needs ${missing} more ${noun}`
}

/**
 * Horizontal bar. `value` and `max` are counts, not percentages, so callers
 * never do the arithmetic themselves and an empty bar stays visible as a
 * track rather than collapsing.
 */
export function Bar({
  value,
  max,
  tone = "bg-aa-primary",
  height = "h-7"
}: {
  value: number
  max: number
  tone?: string
  height?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className={`aa-overview-track flex-1 ${height}`}>
      {value > 0 ? (
        <div
          className={`h-full rounded-aa-sm ${tone}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      ) : null}
    </div>
  )
}

/** Row that navigates somewhere; renders as a button with a chevron. */
export function DrillRow({
  icon,
  iconClass,
  label,
  sub,
  count,
  onClick
}: {
  icon: ReactNode
  iconClass: string
  label: string
  sub: string
  count: number | string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="aa-overview-row">
      <span className={`aa-overview-icon-wrap ${iconClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-aa-13 font-semibold text-aa-text-primary">
          {label}
        </span>
        <span className="block text-aa-11 text-aa-text-secondary">{sub}</span>
      </span>
      <span className="text-aa-13 font-bold tabular-nums text-aa-text-primary">
        {count}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-aa-neutral-400" />
    </button>
  )
}

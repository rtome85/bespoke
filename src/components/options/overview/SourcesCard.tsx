import { Info } from "lucide-react"

import { sourceBreakdown, type SourceRow } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

import { OverviewCard } from "./primitives"

/**
 * Conversion by where the posting came from — derived from the job URL that is
 * already saved with every application, so it costs one hostname lookup and no
 * new data capture.
 */
export function SourcesCard({ apps }: { apps: SavedApplication[] }) {
  const rows = sourceBreakdown(apps)

  if (rows.length === 0) {
    return (
      <OverviewCard
        title="Where your applications come from"
        sub="Reply and interview rates per job board.">
        <p className="text-aa-caption text-aa-text-secondary">
          Nothing applied yet — this fills in from the job URL saved with each
          application.
        </p>
      </OverviewCard>
    )
  }

  const max = Math.max(...rows.map((r) => r.applied))

  return (
    <OverviewCard
      title="Where your applications come from"
      sub="Taken from the saved job URL — no extra data to capture.">
      <div className="flex items-center gap-4 pb-2.5">
        <span className="aa-overview-eyebrow flex-1">Source</span>
        <span className="aa-overview-eyebrow w-16 text-right">Applied</span>
        <span className="aa-overview-eyebrow w-24 text-right">Reply rate</span>
        <span className="aa-overview-eyebrow w-28 text-right">
          Interview rate
        </span>
        <span className="aa-overview-eyebrow w-14 text-right">Offers</span>
        <span className="aa-overview-eyebrow w-28">Volume</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center gap-4 border-t border-aa-border-subtle py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-aa-13 font-semibold text-aa-text-primary">
              {row.label}
            </span>
            <span
              title={row.hosts.length > 1 ? row.hosts.join(", ") : undefined}
              className="block truncate text-aa-11 text-aa-text-secondary">
              {row.detail}
            </span>
          </span>
          <span className="w-16 text-right text-aa-13 font-semibold tabular-nums text-aa-text-primary">
            {row.applied}
          </span>
          <RateCell row={row} which="replyRate" />
          <RateCell row={row} which="interviewRate" wide />
          <span className="w-14 text-right text-aa-13 font-semibold tabular-nums text-aa-text-primary">
            {row.offers}
          </span>
          <span className="aa-overview-track h-2 w-28">
            <span
              className="block h-full rounded-aa-pill bg-aa-primary"
              style={{ width: `${Math.max((row.applied / max) * 100, 4)}%` }}
            />
          </span>
        </div>
      ))}

      <div className="mt-4 flex items-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-aa-text-secondary" />
        <span className="text-aa-11 text-aa-text-secondary">
          Rates stay hidden under five applications from a source — too little
          data to act on.
        </span>
      </div>
    </OverviewCard>
  )
}

function RateCell({
  row,
  which,
  wide
}: {
  row: SourceRow
  which: "replyRate" | "interviewRate"
  wide?: boolean
}) {
  const rate = row[which]
  return (
    <span className={`${wide ? "w-28" : "w-24"} text-right`}>
      <span
        className={`block text-aa-13 font-semibold tabular-nums ${
          rate.value === null || rate.value === 0
            ? "text-aa-text-secondary"
            : "text-aa-text-primary"
        }`}>
        {rate.value === null ? "—" : `${rate.value}%`}
      </span>
    </span>
  )
}

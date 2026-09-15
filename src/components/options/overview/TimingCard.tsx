import { timingStats } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

import { OverviewCard } from "./primitives"

/**
 * How long things take: time to the first reply (from `firstReplyAt`, stamped
 * once when an application is first answered), the longest current silence,
 * and how long the applications sitting in each stage have been sitting there.
 * Claims nothing about stages the data cannot reconstruct — per-transition
 * durations would need a status history that storage does not keep.
 */
export function TimingCard({ apps }: { apps: SavedApplication[] }) {
  const timing = timingStats(apps)
  const maxDwell = Math.max(...timing.dwellByStage.map((d) => d.avgDays), 1)

  return (
    <OverviewCard
      title="Time in stage"
      sub="How long things actually take — and what is overdue.">
      <div className="flex gap-3">
        <div className="aa-overview-tile">
          <span
            className={
              timing.medianDaysToReply === null
                ? "aa-overview-stat-muted"
                : "aa-overview-stat"
            }>
            {timing.medianDaysToReply === null
              ? "—"
              : `${timing.medianDaysToReply}d`}
          </span>
          <span className="mt-1 block text-aa-11 text-aa-text-secondary">
            median to first reply
          </span>
        </div>
        <div className="aa-overview-tile">
          <span
            className={`aa-overview-stat ${
              (timing.oldestWaitingDays ?? 0) >= 14
                ? "text-aa-warning-strong"
                : ""
            }`}>
            {timing.oldestWaitingDays === null
              ? "—"
              : `${timing.oldestWaitingDays}d`}
          </span>
          <span className="mt-1 block text-aa-11 text-aa-text-secondary">
            oldest still waiting
          </span>
        </div>
      </div>

      {timing.dwellByStage.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="aa-overview-eyebrow">Average days sitting in stage</p>
          {timing.dwellByStage.map((stage) => (
            <div key={stage.status} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-aa-11 text-aa-text-secondary">
                {stage.status}
              </span>
              <span className="aa-overview-track h-2 flex-1">
                <span
                  className="block h-full rounded-aa-pill bg-aa-primary-soft"
                  style={{
                    width: `${Math.max((stage.avgDays / maxDwell) * 100, 3)}%`
                  }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-aa-11 font-semibold tabular-nums text-aa-text-primary">
                {stage.avgDays}d
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </OverviewCard>
  )
}

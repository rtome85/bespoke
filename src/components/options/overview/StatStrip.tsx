import {
  rate,
  stageCounts,
  timingStats,
  volumeDelta,
  type StageCounts,
  type TimingStats
} from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

import { rateHint } from "./primitives"

function trackedSub(
  volume: { current: number; previous: number; delta: number },
  counts: StageCounts
): string {
  if (volume.previous === 0 && volume.current === 0) {
    return `${counts.applied} applied, ${counts.tracked - counts.applied} saved`
  }
  if (volume.previous === 0) return `${volume.current} sent in the last 30 days`
  const sign = volume.delta > 0 ? "+" : ""
  return `${volume.current} in 30 days (${sign}${volume.delta} vs prior 30)`
}

/**
 * The five headline numbers. Rates render as "—" until the sample is big
 * enough (see `MIN_APPS_FOR_RATES`) — a 33% response rate over three
 * applications is one reply, and reads as a trend it is not.
 */
export function StatStrip({
  apps,
  onNavigate
}: {
  apps: SavedApplication[]
  onNavigate: (hash: string) => void
}) {
  const counts: StageCounts = stageCounts(apps)
  const timing: TimingStats = timingStats(apps)
  const volume = volumeDelta(apps)
  const replyRate = rate(counts.replied, counts.applied)
  const interviewRate = rate(counts.interviewed, counts.applied)

  const tiles: {
    label: string
    value: string
    muted?: boolean
    sub: string
    hash?: string
  }[] = [
    {
      label: "Tracked",
      value: String(counts.tracked),
      sub: trackedSub(volume, counts),
      hash: "#/applications"
    },
    {
      label: "Reply rate",
      value: replyRate.value === null ? "—" : `${replyRate.value}%`,
      muted: replyRate.value === null,
      sub: rateHint(replyRate),
      hash: "#/applications/all/replied"
    },
    {
      label: "Interview rate",
      value: interviewRate.value === null ? "—" : `${interviewRate.value}%`,
      muted: interviewRate.value === null,
      sub:
        interviewRate.value === null
          ? rateHint(interviewRate)
          : `${counts.interviewed} ever reached a round`,
      hash: "#/applications/all/interviewed"
    },
    {
      label: "Offers",
      value: String(counts.offers),
      sub:
        counts.interviewed > 0
          ? `from ${counts.interviewed} interviewed`
          : "no interviews yet",
      hash: counts.offers > 0 ? "#/applications/all/Offer" : undefined
    },
    {
      label: "Median reply",
      value:
        timing.medianDaysToReply === null
          ? "—"
          : `${timing.medianDaysToReply} days`,
      muted: timing.medianDaysToReply === null,
      sub:
        timing.medianDaysToReply === null
          ? `needs ${Math.max(1, 3 - timing.replySample)} more replies`
          : timing.oldestWaitingDays === null
            ? `over ${timing.replySample} replies`
            : `oldest waiting: ${timing.oldestWaitingDays} days`
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map((tile) => {
        const body = (
          <>
            <span className="block text-aa-11 font-semibold uppercase tracking-wider text-aa-text-secondary">
              {tile.label}
            </span>
            <span
              className={`${tile.muted ? "aa-overview-stat-muted" : "aa-overview-stat"} mt-2`}>
              {tile.value}
            </span>
            <span className="mt-1.5 block text-aa-11 text-aa-text-secondary">
              {tile.sub}
            </span>
          </>
        )
        return tile.hash ? (
          <button
            key={tile.label}
            type="button"
            onClick={() => onNavigate(tile.hash!)}
            className="aa-card text-left transition-colors hover:border-aa-primary">
            {body}
          </button>
        ) : (
          <div key={tile.label} className="aa-card">
            {body}
          </div>
        )
      })}
    </div>
  )
}

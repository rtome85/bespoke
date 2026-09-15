import { Lightbulb } from "lucide-react"

import { matchBands, type MatchBand } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

import { Bar, OverviewCard } from "./primitives"

/**
 * Interview rate per match-score band — the one card that answers whether the
 * score this extension computes predicts anything, and therefore whether a
 * given posting is worth the time it takes to apply.
 */
export function MatchBandsCard({ apps }: { apps: SavedApplication[] }) {
  const bands = matchBands(apps).filter((b) => b.count > 0)

  if (bands.length === 0) {
    return (
      <OverviewCard
        title="Does the match score predict anything?"
        sub="Interview rate per match band.">
        <p className="text-aa-caption text-aa-text-secondary">
          No applied job has a match score yet. Run a match from the side panel
          and this fills in.
        </p>
      </OverviewCard>
    )
  }

  const max = Math.max(...bands.map((b) => b.count))
  const insight = bandInsight(bands)

  return (
    <OverviewCard
      title="Does the match score predict anything?"
      sub="Interview rate per match band, over applications you actually sent.">
      <div className="space-y-3">
        {bands.map((band) => (
          <div key={band.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-aa-caption font-semibold text-aa-text-primary">
              {band.label}
            </span>
            <Bar
              value={band.interviewed}
              max={max}
              tone={bandTone(band)}
              height="h-6"
            />
            <span className="w-12 shrink-0 text-right text-aa-13 font-bold tabular-nums text-aa-text-primary">
              {band.interviewRate.value === null
                ? "—"
                : `${band.interviewRate.value}%`}
            </span>
            <span className="w-16 shrink-0 text-right text-aa-11 text-aa-text-secondary">
              {band.count} {band.count === 1 ? "app" : "apps"}
            </span>
          </div>
        ))}
      </div>

      {insight ? (
        <div className="mt-4 flex items-center gap-3 rounded-aa-md bg-aa-surface-brand-soft p-3.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-aa-primary" />
          <p className="text-aa-caption font-semibold text-aa-text-primary">
            {insight}
          </p>
        </div>
      ) : null}
    </OverviewCard>
  )
}

function bandTone(band: MatchBand): string {
  if (band.interviewRate.value === null) return "bg-aa-neutral-300"
  if (band.min >= 85) return "bg-aa-success-strong"
  if (band.min >= 75) return "bg-aa-primary"
  if (band.min >= 65) return "bg-aa-warning-strong"
  return "bg-aa-neutral-300"
}

/**
 * Only states something the data actually supports: the comparison needs a
 * readable rate at both ends, and a gap worth acting on.
 */
function bandInsight(bands: MatchBand[]): string | null {
  const measured = bands.filter((b) => b.interviewRate.value !== null)
  if (measured.length < 2) return null

  const best = measured[0]
  const worst = measured[measured.length - 1]
  const bestRate = best.interviewRate.value!
  const worstRate = worst.interviewRate.value!

  if (worstRate === 0 && bestRate > 0) {
    return `Nothing in the ${worst.label} band has reached an interview; the ${best.label} band converts at ${bestRate}%.`
  }
  if (bestRate - worstRate >= 20) {
    return `${best.label} matches convert ${Math.round(bestRate / Math.max(worstRate, 1))}× better than ${worst.label} ones.`
  }
  return `Match score barely moves the outcome so far — ${best.label} converts at ${bestRate}%, ${worst.label} at ${worstRate}%.`
}

import { useMemo, useState } from "react"

import { activityBuckets, type ActivityRange } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

import { OverviewCard } from "./primitives"

const RANGES: { value: ActivityRange; label: string }[] = [
  { value: "8w", label: "8 weeks" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" }
]

const CHART_HEIGHT = 120

/**
 * Volume over time, split by whether the applications in each bucket ever got
 * an answer — so a tall bar of silence reads differently from a tall bar that
 * converted.
 *
 * Counts sit above every bar rather than on hover: the previous chart revealed
 * them only to a mouse, which left keyboard and touch users with an unlabelled
 * picture.
 */
export function ActivityCard({ apps }: { apps: SavedApplication[] }) {
  const [range, setRange] = useState<ActivityRange>("8w")
  const buckets = useMemo(() => activityBuckets(apps, range), [apps, range])
  const max = Math.max(...buckets.map((b) => b.total), 1)

  return (
    <OverviewCard
      title="Activity"
      sub="Applications tracked per period, split by whether they got a reply."
      action={
        <div
          role="group"
          aria-label="Activity range"
          className="flex shrink-0 gap-1 rounded-aa-md bg-aa-neutral-100 p-1">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={
                range === option.value
                  ? "aa-overview-segment-on"
                  : "aa-overview-segment"
              }>
              {option.label}
            </button>
          ))}
        </div>
      }>
      <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {buckets.map((bucket) => {
          const waiting = bucket.total - bucket.replied
          return (
            <div
              key={bucket.key}
              role="img"
              aria-label={`${bucket.label}: ${bucket.total} tracked, ${bucket.replied} replied${
                bucket.partial ? ", current period so far" : ""
              }`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-aa-11 font-semibold tabular-nums text-aa-text-primary">
                {bucket.total}
              </span>
              <div className="flex w-full flex-col items-center justify-end">
                <div
                  className={`w-full max-w-aa-bar overflow-hidden rounded-aa-sm ${
                    bucket.total === 0 ? "bg-aa-neutral-100" : ""
                  }`}
                  style={{
                    height:
                      bucket.total === 0
                        ? 3
                        : Math.max(
                            Math.round(
                              (bucket.total / max) * (CHART_HEIGHT - 40)
                            ),
                            6
                          )
                  }}>
                  <div
                    className={
                      bucket.partial ? "bg-aa-neutral-200" : "bg-aa-neutral-300"
                    }
                    style={{
                      height: `${bucket.total > 0 ? (waiting / bucket.total) * 100 : 0}%`
                    }}
                  />
                  <div
                    className={
                      bucket.partial ? "bg-aa-primary-soft" : "bg-aa-primary"
                    }
                    style={{
                      height: `${bucket.total > 0 ? (bucket.replied / bucket.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {buckets.map((bucket) => (
          <span
            key={bucket.key}
            className="flex-1 text-center text-aa-10 text-aa-text-secondary">
            {bucket.partial ? "now" : bucket.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Legend tone="bg-aa-primary" label="Got a reply" />
        <Legend tone="bg-aa-neutral-300" label="Still waiting" />
        <Legend tone="bg-aa-primary-soft" label="Current period (partial)" />
      </div>
    </OverviewCard>
  )
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-aa-2xs ${tone}`} />
      <span className="text-aa-11 text-aa-text-secondary">{label}</span>
    </span>
  )
}

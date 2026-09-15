import { TrendingDown, TrendingUp } from "lucide-react"

import { debriefStats } from "~lib/overview/metrics"
import type { DebriefOutcome, SavedApplication } from "~types/userProfile"

import { OverviewCard } from "./primitives"

const OUTCOME_LABEL: Record<DebriefOutcome, string> = {
  advance: "Advanced",
  offer: "Offer",
  reject: "Rejected",
  waiting: "Waiting"
}

const OUTCOME_TONE: Record<DebriefOutcome, string> = {
  advance: "bg-aa-primary",
  offer: "bg-aa-success-strong",
  reject: "bg-aa-error-strong",
  waiting: "bg-aa-neutral-300"
}

/**
 * Everything here is already captured per round in the debrief workspace and
 * then never looked at again. Aggregated, the self-ratings say which kind of
 * round is actually costing you offers.
 */
export function InterviewPerformanceCard({
  apps
}: {
  apps: SavedApplication[]
}) {
  const stats = debriefStats(apps)

  if (stats.logged === 0) {
    return (
      <OverviewCard
        title="Interview performance"
        sub="From your debriefs — how the rounds themselves went.">
        <p className="text-aa-caption text-aa-text-secondary">
          No debriefs logged yet. Rate a round after it happens and this starts
          tracking how you do by round type.
        </p>
      </OverviewCard>
    )
  }

  const outcomeTotal = stats.outcomes.reduce((n, o) => n + o.count, 0)

  return (
    <OverviewCard
      title="Interview performance"
      sub="From your debriefs — recorded per round today, aggregated nowhere else.">
      <div className="flex items-center gap-4">
        <div>
          <span className="block text-aa-28 font-bold leading-none tracking-aa-tighter-4 text-aa-text-primary">
            {stats.avgRating === null ? "—" : stats.avgRating.toFixed(1)}
          </span>
          <span className="mt-1.5 block text-aa-11 text-aa-text-secondary">
            avg self-rating · {stats.logged}{" "}
            {stats.logged === 1 ? "debrief" : "debriefs"}
          </span>
        </div>
        <span className="flex-1" />
        {stats.trendDelta !== null && stats.trendDelta !== 0 ? (
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-aa-pill px-2.5 py-1 text-aa-11 font-semibold ${
              stats.trendDelta > 0
                ? "bg-aa-success-soft text-aa-success-strong"
                : "bg-aa-error-soft text-aa-error-strong"
            }`}>
            {stats.trendDelta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {stats.trendDelta > 0 ? "+" : ""}
            {stats.trendDelta} over last 5
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {stats.byType.map((type) => (
          <div key={type.type} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-aa-caption font-semibold text-aa-text-primary">
              {type.label}
            </span>
            <span className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((dot) => (
                <span
                  key={dot}
                  className={`h-3 w-3 rounded-aa-pill ${dotTone(
                    dot,
                    type.avgRating
                  )}`}
                />
              ))}
            </span>
            <span className="w-10 shrink-0 text-aa-caption font-bold tabular-nums text-aa-text-primary">
              {type.avgRating === null ? "—" : type.avgRating.toFixed(1)}
            </span>
            <span className="flex-1" />
            <span className="text-aa-11 text-aa-text-secondary">
              {type.rounds} {type.rounds === 1 ? "round" : "rounds"}
            </span>
          </div>
        ))}
      </div>

      {outcomeTotal > 0 ? (
        <div className="mt-4">
          <p className="aa-overview-eyebrow">Outcome of debriefed rounds</p>
          <div className="mt-2 flex h-5 overflow-hidden rounded-aa-sm">
            {stats.outcomes.map((outcome) => (
              <span
                key={outcome.outcome}
                className={OUTCOME_TONE[outcome.outcome]}
                style={{
                  width: `${(outcome.count / outcomeTotal) * 100}%`
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {stats.outcomes.map((outcome) => (
              <span
                key={outcome.outcome}
                className="flex items-center gap-1.5 text-aa-11 text-aa-text-secondary">
                <span
                  className={`h-2.5 w-2.5 rounded-aa-2xs ${OUTCOME_TONE[outcome.outcome]}`}
                />
                {OUTCOME_LABEL[outcome.outcome]} {outcome.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </OverviewCard>
  )
}

/** Filled dots up to the rounded rating; amber once the average dips low. */
function dotTone(dot: number, rating: number | null): string {
  if (rating === null || dot > Math.round(rating)) return "bg-aa-neutral-200"
  return rating < 3.5 ? "bg-aa-warning-strong" : "bg-aa-primary"
}

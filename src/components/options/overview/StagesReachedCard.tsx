import { ChevronRight } from "lucide-react"

import { rate, stageCounts, type Rate } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

import { Bar, OverviewCard } from "./primitives"

/**
 * Replaces the old status funnel.
 *
 * The old card counted applications by their *current* status, so anything
 * rejected after an interview vanished from every stage above "Reject" and
 * every conversion rate came out too low. These rows count applications that
 * ever reached the stage, and the outcomes sit beside the funnel instead of
 * inside it.
 */
export function StagesReachedCard({
  apps,
  onNavigate
}: {
  apps: SavedApplication[]
  onNavigate: (hash: string) => void
}) {
  const counts = stageCounts(apps)
  const max = Math.max(counts.tracked, 1)

  const stages: {
    label: string
    count: number
    conversion: Rate | null
    conversionLabel: string
    tone: string
    hash?: string
  }[] = [
    {
      label: "Saved",
      count: counts.tracked,
      conversion: null,
      conversionLabel: "",
      tone: "bg-aa-neutral-400",
      hash: "#/applications"
    },
    {
      label: "Applied",
      count: counts.applied,
      conversion: rate(counts.applied, counts.tracked),
      conversionLabel: "of saved",
      tone: "bg-aa-primary",
      hash: "#/applications/all/sent"
    },
    {
      label: "Interviewed",
      count: counts.interviewed,
      conversion: rate(counts.interviewed, counts.applied),
      conversionLabel: "of applied",
      tone: "bg-aa-primary",
      hash: "#/applications/all/interviewed"
    },
    {
      label: "Offer",
      count: counts.offers,
      conversion: rate(counts.offers, counts.interviewed),
      conversionLabel: "of interviewed",
      tone: "bg-aa-success-strong",
      hash: counts.offers > 0 ? "#/applications/all/Offer" : undefined
    }
  ]

  const outcomes = [
    {
      label: "Rejected",
      count: counts.rejected,
      sub: "including rejections after an interview",
      valueClass: "text-aa-error-strong",
      wrapClass: "bg-aa-error-soft",
      hash: "#/applications/all/Reject"
    },
    {
      label: "No reply yet",
      count: counts.awaiting,
      sub: "applied, still silent",
      valueClass: "text-aa-text-secondary",
      wrapClass: "bg-aa-neutral-100",
      hash: "#/applications/all/Applied"
    }
  ].filter((o) => o.count > 0)

  return (
    <OverviewCard
      title="Stages reached"
      sub="Every application that ever reached the stage, rejections included. Pick a row to open that slice of the list.">
      <div>
        {stages.map((stage) => (
          <button
            key={stage.label}
            type="button"
            disabled={!stage.hash}
            onClick={() => stage.hash && onNavigate(stage.hash)}
            className="flex w-full items-center gap-4 border-b border-aa-border py-2.5 text-left last:border-0 disabled:cursor-default">
            <span
              className={`w-24 shrink-0 text-aa-13 font-semibold ${
                stage.count > 0
                  ? "text-aa-text-primary"
                  : "text-aa-text-secondary"
              }`}>
              {stage.label}
            </span>
            <Bar value={stage.count} max={max} tone={stage.tone} />
            <span className="w-28 shrink-0 text-right text-aa-11 text-aa-text-secondary">
              {stage.conversion
                ? stage.conversion.value === null
                  ? "—"
                  : `${stage.conversion.value}% ${stage.conversionLabel}`
                : ""}
            </span>
            <span
              className={`w-8 shrink-0 text-right text-aa-13 font-bold tabular-nums ${
                stage.count > 0 ? "text-aa-text-primary" : "text-aa-neutral-400"
              }`}>
              {stage.count}
            </span>
            <ChevronRight
              className={`h-4 w-4 shrink-0 ${
                stage.hash ? "text-aa-neutral-400" : "text-transparent"
              }`}
            />
          </button>
        ))}
      </div>

      {outcomes.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {outcomes.map((outcome) => (
            <button
              key={outcome.label}
              type="button"
              onClick={() => onNavigate(outcome.hash)}
              className={`flex flex-1 items-center gap-3 rounded-aa-md p-3 text-left transition-opacity hover:opacity-80 ${outcome.wrapClass}`}>
              <span
                className={`text-aa-20 font-bold tabular-nums ${outcome.valueClass}`}>
                {outcome.count}
              </span>
              <span className="min-w-0">
                <span className="block text-aa-caption font-semibold text-aa-text-primary">
                  {outcome.label}
                </span>
                <span className="block text-aa-11 text-aa-text-secondary">
                  {outcome.sub}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </OverviewCard>
  )
}

import { Download, ShieldCheck } from "lucide-react"

import { ActivityCard } from "~components/options/overview/ActivityCard"
import { InterviewPerformanceCard } from "~components/options/overview/InterviewPerformanceCard"
import { MatchBandsCard } from "~components/options/overview/MatchBandsCard"
import { NeedsYouCard } from "~components/options/overview/NeedsYouCard"
import { RecurringGapsCard } from "~components/options/overview/RecurringGapsCard"
import { SourcesCard } from "~components/options/overview/SourcesCard"
import { StagesReachedCard } from "~components/options/overview/StagesReachedCard"
import { StatStrip } from "~components/options/overview/StatStrip"
import { TimingCard } from "~components/options/overview/TimingCard"
import {
  applicationsToCsv,
  downloadCsv,
  roundsToCsv
} from "~lib/overview/exportCsv"
import { MIN_APPS_FOR_RATES, stageCounts } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  applications: SavedApplication[]
  onNavigate: (hash: string) => void
}

export function ApplicationsOverview({ applications, onNavigate }: Props) {
  if (applications.length === 0) {
    return (
      <div className="aa-card text-center py-16">
        <p className="text-aa-sm font-semibold text-aa-text-primary">
          Nothing to chart yet
        </p>
        <p className="text-aa-13 text-aa-text-secondary mt-1">
          Track a few applications and this fills in — what needs you today,
          then how the pipeline is actually converting.
        </p>
      </div>
    )
  }

  const counts = stageCounts(applications)
  const belowThreshold = counts.applied < MIN_APPS_FOR_RATES

  const exportCsv = () => {
    const stamp = new Date().toISOString().split("T")[0]
    downloadCsv(
      `bespoke-applications-${stamp}.csv`,
      applicationsToCsv(applications)
    )
    if (applications.some((a) => (a.rounds ?? []).length > 0)) {
      downloadCsv(`bespoke-rounds-${stamp}.csv`, roundsToCsv(applications))
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <h1 className="text-aa-28 font-bold tracking-aa-tighter-4 text-aa-text-primary flex-1">
          Overview
        </h1>
        <button type="button" onClick={exportCsv} className="aa-btn-outline bg-aa-primary hover:bg-aa-primary-hover">
          <span className="flex items-center gap-1.5 text-white">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </span>
        </button>
      </div>

      <NeedsYouCard apps={applications} onNavigate={onNavigate} />

      <StatStrip apps={applications} onNavigate={onNavigate} />

      {belowThreshold ? (
        <div className="aa-card flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-aa-text-secondary mt-0.5" />
          <div>
            <p className="text-aa-13 font-semibold text-aa-text-primary">
              Some numbers stay hidden for now
            </p>
            <p className="text-aa-caption text-aa-text-secondary mt-1 leading-aa-1.45">
              With {counts.applied}{" "}
              {counts.applied === 1 ? "application" : "applications"} sent, a
              single reply would read as a {replySwing(counts.applied)}%
              response rate — a number that swings wildly and invites the wrong
              conclusion. Counts, the pipeline and the activity chart are exact
              from day one; rates unlock at {MIN_APPS_FOR_RATES} applications.
            </p>
          </div>
        </div>
      ) : null}

      <StagesReachedCard apps={applications} onNavigate={onNavigate} />

      <ActivityCard apps={applications} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MatchBandsCard apps={applications} />
        <TimingCard apps={applications} />
        <InterviewPerformanceCard apps={applications} />
        <RecurringGapsCard apps={applications} onNavigate={onNavigate} />
      </div>

      <SourcesCard apps={applications} />
    </div>
  )
}

/** What one reply would look like as a percentage at the current sample. */
const replySwing = (applied: number) =>
  applied > 0 ? Math.round((1 / applied) * 100) : 100

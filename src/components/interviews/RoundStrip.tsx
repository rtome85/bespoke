import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

import {
  formatLabel,
  relativeDayLabel,
  roundLabel
} from "~lib/interviews/selectors"
import type { InterviewRound, SavedApplication } from "~types/userProfile"

interface Props {
  app: SavedApplication
  round: InterviewRound
  /** Right-aligned slot — typically a state pill. */
  right?: ReactNode
  onViewInSchedule?: () => void
}

/** Shared facts header for the Prep / Debrief workspaces. */
export function RoundStrip({ app, round, right, onViewInSchedule }: Props) {
  const facts = [
    round.date && `${round.date} (${relativeDayLabel(round.date)})`,
    round.time,
    formatLabel(round.format),
    round.interviewers?.split("\n")[0]
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-aa-text-primary truncate">
          {app.company} — {roundLabel(round)}
        </p>
        <p className="text-[12px] text-aa-text-secondary mt-0.5 truncate">
          {facts || "Not scheduled yet"}
        </p>
        {onViewInSchedule && (
          <button
            type="button"
            onClick={onViewInSchedule}
            className="inline-flex items-center gap-0.5 mt-1.5 text-[12px] font-semibold text-aa-primary hover:underline">
            View in Schedule
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

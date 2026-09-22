import {
  AlarmClock,
  Bookmark,
  CalendarClock,
  CalendarPlus,
  Check,
  ClipboardCheck,
  Send
} from "lucide-react"

import {
  applicationFilterRoute,
  interviewPrepRoute,
  ROUTES
} from "~constants/routes"
import {
  formatLabel,
  relativeDayLabel,
  roundLabel
} from "~lib/interviews/selectors"
import { needsYou, QUIET_DAYS, UNDECIDED_DAYS } from "~lib/overview/needsYou"
import type { SavedApplication } from "~types/userProfile"

import { DrillRow } from "./primitives"

/**
 * The only card on Overview that is about *doing* something. It sits above the
 * charts because the rest of the screen is retrospective: counts explain what
 * already happened, these rows are what is still owed.
 */
export function NeedsYouCard({
  apps,
  onNavigate
}: {
  apps: SavedApplication[]
  onNavigate: (hash: string) => void
}) {
  const work = needsYou(apps)
  const next = work.nextRound

  if (!next && work.total === 0) {
    return (
      <section className="aa-card flex items-center gap-4">
        <span className="aa-overview-icon-wrap h-9 w-9 bg-aa-success-soft">
          <Check className="h-5 w-5 text-aa-success-strong" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-aa-sm font-semibold text-aa-text-primary">
            Nothing is waiting on you
          </p>
          <p className="text-aa-caption text-aa-text-secondary">
            No interviews scheduled, no debriefs owed, no follow-ups open.
          </p>
        </div>
      </section>
    )
  }

  const rows: {
    key: string
    icon: JSX.Element
    iconClass: string
    label: string
    sub: string
    count: number
    hash: string
  }[] = []

  if (work.debriefsOwed.length > 0) {
    rows.push({
      key: "debriefs",
      icon: <ClipboardCheck className="h-4 w-4 text-aa-warning-strong" />,
      iconClass: "bg-aa-warning-soft",
      label: `${work.debriefsOwed.length} ${plural(work.debriefsOwed.length, "debrief")} owed`,
      sub: "Rounds that happened with nothing logged",
      count: work.debriefsOwed.length,
      hash: ROUTES.interviewDebriefs
    })
  }

  if (work.openFollowUps.length > 0) {
    rows.push({
      key: "followups",
      icon: <Send className="h-4 w-4 text-aa-error-strong" />,
      iconClass: "bg-aa-error-soft",
      label: `${work.openFollowUps.length} open ${plural(work.openFollowUps.length, "follow-up")}`,
      sub: firstFollowUp(work.openFollowUps),
      count: work.openFollowUps.length,
      hash: ROUTES.interviewDebriefs
    })
  }

  if (work.goneQuiet.length > 0) {
    rows.push({
      key: "quiet",
      icon: <AlarmClock className="h-4 w-4 text-aa-text-secondary" />,
      iconClass: "bg-aa-neutral-100",
      label: `${work.goneQuiet.length} gone quiet`,
      sub: `Applied ${QUIET_DAYS}+ days ago, still no reply`,
      count: work.goneQuiet.length,
      hash: applicationFilterRoute("Applied")
    })
  }

  if (work.undecidedSaves.length > 0) {
    rows.push({
      key: "saved",
      icon: <Bookmark className="h-4 w-4 text-aa-text-secondary" />,
      iconClass: "bg-aa-neutral-100",
      label: `${work.undecidedSaves.length} saved, never decided`,
      sub: `Matched ${UNDECIDED_DAYS}+ days ago, never applied or dropped`,
      count: work.undecidedSaves.length,
      hash: applicationFilterRoute("Saved")
    })
  }

  if (work.interviewingWithoutRound.length > 0) {
    rows.push({
      key: "unscheduled",
      icon: <CalendarPlus className="h-4 w-4 text-aa-primary" />,
      iconClass: "bg-aa-primary-soft",
      label: `${work.interviewingWithoutRound.length} without a scheduled round`,
      sub: "Marked as interviewing, but nothing is in the calendar",
      count: work.interviewingWithoutRound.length,
      hash: ROUTES.interviewSchedule
    })
  }

  return (
    <section className="aa-card">
      <h3 className="aa-card-heading">Needs you</h3>
      <p className="aa-card-sub">
        {work.total > 0
          ? `${work.total} ${plural(work.total, "thing")} waiting on you. Everything below is retrospective.`
          : "Nothing outstanding — your next round is below."}
      </p>

      {next ? (
        <div className="mt-4 flex items-center gap-4 rounded-aa-md border border-aa-primary bg-aa-surface-brand-soft p-4">
          <span className="aa-overview-icon-wrap h-9 w-9 bg-aa-primary">
            <CalendarClock className="h-5 w-5 text-aa-text-on-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-aa-sm font-semibold text-aa-text-primary">
              {roundLabel(next.round)} · {next.app.company} —{" "}
              {next.app.jobTitle}
            </p>
            <p className="text-aa-caption text-aa-text-secondary">
              {[
                capitalize(relativeDayLabel(next.round.date!)),
                next.round.time,
                formatLabel(next.round.format)
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span
            className={`aa-pill shrink-0 ${
              work.nextRoundPrepReady ? "aa-pill-ok" : "aa-pill-idle"
            }`}>
            {work.nextRoundPrepReady ? "Prep ready" : "Not prepped"}
          </span>
          <button
            type="button"
            onClick={() => onNavigate(interviewPrepRoute(next.round.id))}
            className="aa-btn-accent shrink-0">
            Open prep
          </button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <DrillRow
              key={row.key}
              icon={row.icon}
              iconClass={row.iconClass}
              label={row.label}
              sub={row.sub}
              count={row.count}
              onClick={() => onNavigate(row.hash)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function firstFollowUp(items: { text: string }[]): string {
  const first = items[0]?.text ?? ""
  const trimmed = first.length > 52 ? `${first.slice(0, 52)}…` : first
  return items.length > 1 ? `${trimmed} + ${items.length - 1} more` : trimmed
}

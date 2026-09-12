import { ChevronRight } from "lucide-react"
import { useMemo, type ReactNode } from "react"

import type { AddRoundEditRef } from "~types/options"
import {
  formatLabel,
  groupByDay,
  hasOpenRound,
  needsDebrief,
  nextRound,
  past,
  relativeDayLabel,
  roundLabel,
  roundsThisWeek,
  roundsWithApp,
  roundTypeTag,
  unscheduled,
  upcoming,
  type RoundRef
} from "~lib/interviews/selectors"
import type { RoundType, SavedApplication } from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  onAdd: () => void
  onEdit: (ref: AddRoundEditRef) => void
}

const TYPE_TAG: Record<RoundType, string> = {
  HR: "bg-aa-neutral-100 text-aa-text-secondary",
  Technical: "bg-aa-primary-soft text-aa-primary",
  Final: "bg-aa-warning-soft text-aa-warning-strong",
  Custom: "bg-aa-neutral-100 text-aa-text-secondary"
}

function RoundRow({
  item,
  onEdit
}: {
  item: RoundRef
  onEdit: (r: AddRoundEditRef) => void
}) {
  const { app, round } = item
  return (
    <button
      type="button"
      onClick={() => onEdit({ app, round })}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-aa-border last:border-0 text-left hover:bg-aa-neutral-50 transition-colors">
      <span className="w-16 shrink-0 text-[12px] font-semibold tabular-nums text-aa-text-primary">
        {round.time || "—"}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-aa-text-primary truncate">
          {app.company}
        </span>
        <span className="block text-[12px] text-aa-text-secondary truncate">
          {roundLabel(round)}
          {round.interviewers ? ` · ${round.interviewers.split("\n")[0]}` : ""}
        </span>
      </span>
      <span
        className={`shrink-0 inline-block px-2 py-0.5 rounded-aa-pill text-[10px] font-bold uppercase tracking-wide ${TYPE_TAG[round.type]}`}>
        {roundTypeTag(round)}
      </span>
      <span className="w-24 shrink-0 text-[12px] text-aa-text-secondary text-right">
        {formatLabel(round.format) || "—"}
      </span>
      <ChevronRight className="w-4 h-4 text-aa-neutral-400 shrink-0" />
    </button>
  )
}

function Band({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-2 bg-aa-neutral-50 border-b border-aa-border text-[10px] font-bold uppercase tracking-wider text-aa-text-secondary">
      {children}
    </div>
  )
}

export function SchedulePage({ apps, onAdd, onEdit }: Props) {
  const { refs, up, pastRefs, unsched, days, next, week, awaiting } =
    useMemo(() => {
      const refs = roundsWithApp(apps)
      const up = upcoming(refs)
      const pastRefs = past(refs)
      const awaiting = pastRefs.filter(
        (r) =>
          !r.round.synthesized &&
          (!r.round.debrief?.loggedAt ||
            r.round.debrief.outcome === "advance" ||
            r.round.debrief.outcome === "waiting")
      )
      return {
        refs,
        up,
        pastRefs,
        unsched: unscheduled(refs),
        days: groupByDay(up),
        next: nextRound(refs),
        week: roundsThisWeek(refs),
        awaiting
      }
    }, [apps])

  const hasAny = refs.length > 0
  const oldestAwaiting = awaiting[awaiting.length - 1]
  const attention = needsDebrief(refs).length
  const canAdd = apps.some((a) => a.status !== "Reject" && !hasOpenRound(a))

  const stats = [
    {
      label: "Next interview",
      value: next ? relativeDayLabel(next.round.date!) : "—",
      sub: next
        ? `${next.round.date} · ${next.app.company} · ${roundLabel(next.round)}`
        : "Nothing scheduled"
    },
    {
      label: "This week",
      value: String(week.length),
      sub: week.length ? "next 7 days" : "nothing in the next 7 days"
    },
    {
      label: "Awaiting result",
      value: String(awaiting.length),
      sub: oldestAwaiting
        ? `${oldestAwaiting.app.company} · ${roundLabel(oldestAwaiting.round)} · ${relativeDayLabel(
            oldestAwaiting.round.date!
          )}`
        : attention
          ? `${attention} to debrief`
          : "all caught up"
    }
  ]

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.4px] text-aa-text-primary">
          Schedule
        </h1>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          title={
            canAdd
              ? undefined
              : "Every application already has an open round, or is rejected"
          }
          className="px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
          Add round
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-aa-surface border border-aa-border rounded-aa-lg p-4">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary">
              {s.label}
            </span>
            <span className="block text-[22px] font-bold text-aa-text-primary leading-none mt-2">
              {s.value}
            </span>
            <span className="block text-[11px] text-aa-text-secondary mt-1.5 truncate">
              {s.sub}
            </span>
          </div>
        ))}
      </div>

      {!hasAny ? (
        <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 py-16 text-center">
          <p className="text-[14px] font-semibold text-aa-text-primary">
            No interviews scheduled
          </p>
          <p className="text-[13px] text-aa-text-secondary mt-1">
            {apps.length === 0
              ? "Track an application first, then add its interview rounds here."
              : "Add a round to start building the agenda."}
          </p>
        </div>
      ) : (
        <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
          {unsched.length > 0 && (
            <>
              <Band>Unscheduled</Band>
              {unsched.map((r) => (
                <RoundRow key={r.round.id} item={r} onEdit={onEdit} />
              ))}
            </>
          )}

          {days.map((g) => (
            <div key={g.day}>
              <Band>
                {g.label}
                {" · "}
                {g.day}
              </Band>
              {g.rounds.map((r) => (
                <RoundRow key={r.round.id} item={r} onEdit={onEdit} />
              ))}
            </div>
          ))}

          {up.length === 0 && unsched.length === 0 && (
            <p className="text-[13px] text-aa-text-secondary text-center py-8">
              Nothing upcoming.
            </p>
          )}

          {pastRefs.length > 0 && (
            <>
              <Band>Earlier</Band>
              {pastRefs.map((r) => (
                <RoundRow key={r.round.id} item={r} onEdit={onEdit} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

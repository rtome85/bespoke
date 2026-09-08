import { ChevronRight } from "lucide-react"
import { useMemo } from "react"

import {
  debriefed,
  needsDebrief,
  roundLabel,
  roundsWithApp,
  type RoundRef
} from "~lib/interviews/selectors"
import type { DebriefOutcome, SavedApplication } from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  onOpen: (roundId: string) => void
}

const OUTCOME_LABEL: Record<DebriefOutcome, string> = {
  advance: "Advancing",
  offer: "Offer",
  reject: "Rejected",
  waiting: "Waiting"
}

const card = "bg-aa-surface border border-aa-border rounded-aa-lg"

function Row({
  item,
  onOpen
}: {
  item: RoundRef
  onOpen: (roundId: string) => void
}) {
  const d = item.round.debrief
  const logged = !!d?.loggedAt
  return (
    <button
      type="button"
      onClick={() => onOpen(item.round.id)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-aa-border last:border-0 text-left hover:bg-aa-neutral-50 transition-colors">
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-aa-text-primary truncate">
          {item.app.company}
        </span>
        <span className="block text-[12px] text-aa-text-secondary truncate">
          {roundLabel(item.round)}
          {item.round.date ? ` · ${item.round.date}` : ""}
        </span>
      </span>

      {logged ? (
        <span className="shrink-0 inline-flex items-center gap-2 text-[12px] text-aa-text-secondary">
          {d?.rating != null && (
            <span className="tabular-nums font-semibold text-aa-text-primary">
              {d.rating}/5
            </span>
          )}
          {d?.outcome && <span>{OUTCOME_LABEL[d.outcome]}</span>}
        </span>
      ) : (
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-aa-pill text-[10px] font-bold uppercase tracking-wide bg-aa-warning-soft text-aa-warning-strong">
          No debrief
        </span>
      )}

      <span className="w-24 shrink-0 text-right text-[12px] font-semibold text-aa-primary">
        {logged ? "View" : "Add debrief"}
      </span>
      <ChevronRight className="w-4 h-4 text-aa-neutral-400 shrink-0" />
    </button>
  )
}

export function DebriefsListPage({ apps, onOpen }: Props) {
  const { needs, logged, thisWeek } = useMemo(() => {
    const refs = roundsWithApp(apps)
    const needs = needsDebrief(refs)
    const logged = debriefed(refs)
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const thisWeek = logged.filter(
      (r) => (r.round.debrief?.loggedAt ?? "") >= weekAgo
    ).length
    return { needs, logged, thisWeek }
  }, [apps])

  const stats = [
    { label: "Needs a debrief", value: needs.length },
    { label: "Logged", value: logged.length },
    { label: "Debriefed this week", value: thisWeek }
  ]

  return (
    <div className="max-w-4xl">
      <h1 className="text-[22px] font-bold tracking-[-0.4px] text-aa-text-primary mb-4">
        Debriefs
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`${card} p-4`}>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary">
              {s.label}
            </span>
            <span className="block text-[22px] font-bold text-aa-text-primary leading-none mt-2">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {needs.length === 0 && logged.length === 0 ? (
        <div className={`${card} p-aa-6 py-16 text-center`}>
          <p className="text-[14px] font-semibold text-aa-text-primary">
            No debriefs yet
          </p>
          <p className="text-[13px] text-aa-text-secondary mt-1">
            Once an interview round is in the past it shows up here to log.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {needs.length > 0 && (
            <div className={`${card} overflow-hidden`}>
              <div className="px-4 py-2 bg-aa-neutral-50 border-b border-aa-border text-[10px] font-bold uppercase tracking-wider text-aa-text-secondary">
                Needs a debrief
              </div>
              {needs.map((r) => (
                <Row key={r.round.id} item={r} onOpen={onOpen} />
              ))}
            </div>
          )}

          {logged.length > 0 && (
            <div className={`${card} overflow-hidden`}>
              <div className="px-4 py-2 bg-aa-neutral-50 border-b border-aa-border text-[10px] font-bold uppercase tracking-wider text-aa-text-secondary">
                Logged
              </div>
              {logged.map((r) => (
                <Row key={r.round.id} item={r} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

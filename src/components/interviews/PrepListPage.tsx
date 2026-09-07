import { ChevronRight } from "lucide-react"
import { useMemo } from "react"

import {
  compareRounds,
  prepReady,
  roundLabel,
  roundsWithApp,
  unscheduled,
  upcoming,
  type RoundRef
} from "~lib/interviews/selectors"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  onOpen: (roundId: string) => void
}

function Row({
  item,
  onOpen
}: {
  item: RoundRef
  onOpen: (roundId: string) => void
}) {
  const ready = prepReady(item.round)
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
      <span
        className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-aa-pill text-[10px] font-bold uppercase tracking-wide ${
          ready
            ? "bg-aa-success-soft text-aa-success-strong"
            : "bg-aa-neutral-100 text-aa-text-secondary"
        }`}>
        {ready ? "Ready" : "Not started"}
      </span>
      <span className="w-20 shrink-0 text-right text-[12px] font-semibold text-aa-primary">
        {ready ? "Review" : "Generate"}
      </span>
      <ChevronRight className="w-4 h-4 text-aa-neutral-400 shrink-0" />
    </button>
  )
}

export function PrepListPage({ apps, onOpen }: Props) {
  const rounds = useMemo(() => {
    const refs = roundsWithApp(apps)
    return [...upcoming(refs), ...unscheduled(refs)].sort(compareRounds)
  }, [apps])

  const readyCount = rounds.filter((r) => prepReady(r.round)).length

  const stats = [
    { label: "To prep", value: rounds.length - readyCount },
    { label: "Prepped", value: readyCount },
    { label: "Upcoming rounds", value: rounds.length }
  ]

  return (
    <div className="max-w-4xl">
      <h1 className="text-[22px] font-bold tracking-[-0.4px] text-aa-text-primary mb-4">
        Prep
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
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
          </div>
        ))}
      </div>

      {rounds.length === 0 ? (
        <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 py-16 text-center">
          <p className="text-[14px] font-semibold text-aa-text-primary">
            Nothing to prep
          </p>
          <p className="text-[13px] text-aa-text-secondary mt-1">
            Schedule an interview round and it shows up here.
          </p>
        </div>
      ) : (
        <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
          <div className="px-4 py-2 bg-aa-neutral-50 border-b border-aa-border text-[10px] font-bold uppercase tracking-wider text-aa-text-secondary">
            Upcoming rounds
          </div>
          {rounds.map((r) => (
            <Row key={r.round.id} item={r} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

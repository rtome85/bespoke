import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { useState } from "react"

interface Props {
  text: string
  added: { name: string; years: number } | null
  onAdd: (name: string, years: number) => void
}

// One row in the "Skill gaps" list of the pre-generate Strengthen step — a
// weakness the match analysis surfaced, with an inline form to add the
// skill (and years) that closes it. Collapses to a confirmed state once added.
export function GapRow({ text, added, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [years, setYears] = useState(1)

  if (added) {
    return (
      <div className="flex items-center gap-aa-3 px-aa-4 py-aa-3">
        <CheckCircle2 className="w-[18px] h-[18px] text-aa-success shrink-0" />
        <div className="flex-1 flex flex-col gap-[2px] min-w-0">
          <span className="text-[14px] font-semibold text-aa-text-primary truncate">
            {added.name}
          </span>
          <span className="text-[12px] text-aa-text-secondary truncate">
            {text}
          </span>
        </div>
        <span className="text-[12px] font-semibold text-aa-success-strong shrink-0">
          Added
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-aa-3 px-aa-4 py-aa-3">
      <div className="flex items-center gap-aa-3">
        <AlertTriangle className="w-[18px] h-[18px] text-aa-error shrink-0" />
        <span className="flex-1 text-[13px] text-aa-text-secondary leading-[1.4]">
          {text}
        </span>
        <button
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-aa-pill border border-aa-border px-[12px] py-[6px] text-[12px] font-semibold text-aa-primary hover:bg-aa-primary-soft transition-colors">
          {open ? "Cancel" : "+ Add"}
        </button>
      </div>
      {open && (
        <div className="flex items-center gap-aa-2 pl-[30px]">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Skill you have"
            className="flex-1 min-w-0 rounded-aa-md border border-aa-border px-aa-3 py-[6px] text-[13px] text-aa-text-primary bg-aa-surface focus:outline-none focus:border-aa-primary"
          />
          <input
            type="number"
            min={0}
            max={40}
            value={years}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              setYears(
                Number.isFinite(parsed) ? Math.min(40, Math.max(0, parsed)) : 0
              )
            }}
            className="w-[52px] rounded-aa-md border border-aa-border px-aa-2 py-[6px] text-[13px] text-aa-text-primary bg-aa-surface focus:outline-none focus:border-aa-primary"
          />
          <span className="text-[12px] text-aa-text-secondary shrink-0">
            yrs
          </span>
          <button
            disabled={!name.trim()}
            onClick={() => {
              onAdd(name.trim(), years)
              setOpen(false)
            }}
            className="shrink-0 rounded-aa-md bg-aa-primary px-[12px] py-[6px] text-[12px] font-semibold text-aa-text-on-primary disabled:opacity-40 hover:bg-aa-primary-hover transition-colors">
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

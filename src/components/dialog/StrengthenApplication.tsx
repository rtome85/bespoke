import { GapRow } from "~components/dialog/GapRow"
import type { AddedGapSkills } from "~types/dialog"

interface Props {
  weaknesses: string[]
  addedGapSkills: AddedGapSkills
  onAddGapSkill: (index: number, name: string, years: number) => void
}

export function StrengthenApplication({
  weaknesses,
  addedGapSkills,
  onAddGapSkill
}: Props) {
  return (
    <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 flex flex-col gap-aa-5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold tracking-[0.6px] text-aa-text-secondary uppercase">
          Before you generate
        </span>
        <span className="text-[15px] font-semibold text-aa-text-primary">
          Strengthen this application
        </span>
        <p className="text-[13px] text-aa-text-secondary leading-[1.5]">
          Close a gap or two below and we'll fold it into your tailored CV and
          cover letter.
        </p>
      </div>

      {weaknesses.length > 0 && (
        <div className="flex flex-col gap-aa-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-aa-text-primary">
              Skill gaps
            </span>
            <span className="text-[12px] font-semibold text-aa-text-secondary tabular-nums">
              {Object.keys(addedGapSkills).length} of {weaknesses.length}{" "}
              addressed
            </span>
          </div>
          <div className="bg-aa-surface-subtle rounded-aa-lg border border-aa-border flex flex-col">
            {weaknesses.map((text, index) => (
              <div
                key={index}
                className={index > 0 ? "border-t border-aa-border" : ""}>
                <GapRow
                  text={text}
                  added={addedGapSkills[index] ?? null}
                  onAdd={(name, years) => onAddGapSkill(index, name, years)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
    <div className="flex flex-col gap-aa-5">
      <div className="flex flex-col gap-1">
        <span className="text-aa-11 font-bold tracking-aa-wider-6px text-aa-text-secondary uppercase">
          Before you generate
        </span>
        <span className="text-aa-15 font-semibold text-aa-text-primary">
          Strengthen this application
        </span>
        <p className="text-aa-13 text-aa-text-secondary leading-normal">
          Close a gap or two below and we'll fold it into your tailored CV and
          cover letter.
        </p>
      </div>

      {weaknesses.length > 0 && (
        <div className="flex flex-col gap-aa-2">
          <div className="flex items-center justify-between">
            <span className="text-aa-13 font-semibold text-aa-text-primary">
              Skill gaps
            </span>
            <span className="text-aa-caption font-semibold text-aa-text-secondary tabular-nums">
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

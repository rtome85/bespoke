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
    <div className="flex flex-col gap-aa-5 px-2">
      <div className="flex flex-col gap-1">
        <span className="text-aa-17 font-semibold text-aa-text-primary">
          Strengthen this application
        </span>
        <p className="text-aa-11 text-aa-text-secondary leading-normal">
          Close a gap or two below and we'll fold it into your tailored CV and
          cover letter.
        </p>
      </div>

      {weaknesses.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-aa-caption font-semibold text-aa-primary tabular-nums">
              {Object.keys(addedGapSkills).length} of {weaknesses.length}{" "}
              addressed
            </span>
          </div>
          <div className="flex flex-col">
            {weaknesses.map((text, index) => (
              <GapRow
                key={text}
                text={text}
                added={addedGapSkills[index] ?? null}
                onAdd={(name, years) => onAddGapSkill(index, name, years)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

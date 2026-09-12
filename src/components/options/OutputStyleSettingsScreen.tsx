import { SlidersHorizontal } from "lucide-react"

import { Spectrum } from "~components/Spectrum"
import {
  DIVIDER_CLASS,
  FOCUS,
  SAMPLE_BULLETS,
  SECTION_HEADING_CLASS,
  STRICTNESS,
  STRICTNESS_NOTE,
  TONE
} from "~constants/options"
import { DEFAULT_LLM_TUNING, type LLMTuningConfig } from "~types/config"

interface Props {
  tuning: LLMTuningConfig
  onChange: (tuning: LLMTuningConfig) => void
}

export function OutputStyleSettingsScreen({ tuning, onChange }: Props) {
  const strictnessIndex = STRICTNESS.indexOf(tuning.matchStrictness)
  const focusIndex = FOCUS.indexOf(tuning.resumeFocus)
  const toneLabel =
    tuning.writingTone[0].toUpperCase() + tuning.writingTone.slice(1)
  const focusLabel =
    tuning.resumeFocus === "skills"
      ? "Skills-first"
      : tuning.resumeFocus === "experience"
        ? "Experience-first"
        : "Balanced"

  return (
    <div className="space-y-8 max-w-4xl">
      <section className="space-y-4">
        <div>
          <h2 className={SECTION_HEADING_CLASS}>Scoring</h2>
          <p className="text-sm text-aa-text-secondary -mt-2">
            How rigorously your profile is matched against the job's
            requirements.
          </p>
        </div>
        <div className="space-y-3 pt-1">
          <span className="block text-[12px] font-semibold text-aa-text-secondary">
            Match strictness
          </span>
          <Spectrum
            stops={["Rigorous", "Balanced", "Lenient"]}
            value={strictnessIndex < 0 ? 1 : strictnessIndex}
            onChange={(index) =>
              onChange({
                ...tuning,
                matchStrictness: STRICTNESS[index] ?? tuning.matchStrictness
              })
            }
          />
          <div className="flex items-start gap-3 rounded-aa-md bg-aa-primary-soft p-4 max-w-[660px]">
            <SlidersHorizontal className="w-4 h-4 text-aa-primary shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-aa-neutral-700">
              {STRICTNESS_NOTE[tuning.matchStrictness]}
            </p>
          </div>
        </div>
      </section>

      <hr className={DIVIDER_CLASS} />

      <section className="space-y-4">
        <div>
          <h2 className={SECTION_HEADING_CLASS}>Writing style</h2>
          <p className="text-sm text-aa-text-secondary -mt-2">
            Tone and emphasis applied to the CV and the cover letter.
          </p>
        </div>

        <div className="flex flex-row gap-10 pt-1">
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="block text-[12px] font-semibold text-aa-text-secondary">
                Tone
              </span>
              <div className="inline-flex rounded-aa-md border border-aa-border p-[3px]">
                {TONE.map((option) => {
                  const selected = tuning.writingTone === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        onChange({ ...tuning, writingTone: option })
                      }
                      className={`px-4 py-2 rounded-aa-sm text-[12px] font-semibold transition-colors ${
                        selected
                          ? "bg-aa-primary text-aa-text-on-primary"
                          : "text-aa-text-secondary hover:text-aa-text-primary"
                      }`}>
                      {option[0].toUpperCase() + option.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-[12px] font-semibold text-aa-text-secondary">
                Resume focus
              </span>
              <Spectrum
                stops={["Skills-first", "Balanced", "Experience-first"]}
                value={focusIndex < 0 ? 1 : focusIndex}
                onChange={(index) =>
                  onChange({
                    ...tuning,
                    resumeFocus: FOCUS[index] ?? tuning.resumeFocus
                  })
                }
              />
            </div>
          </div>

          <div className="w-sm rounded-aa-lg border border-aa-border bg-aa-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-aa-text-secondary">
                Sample bullet
              </span>
              <span className="text-[10px] font-semibold rounded-aa-pill border border-aa-border px-2 py-[3px] text-aa-text-secondary">
                {toneLabel} · {focusLabel}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-aa-neutral-700">
              {SAMPLE_BULLETS[tuning.writingTone][tuning.resumeFocus]}
            </p>
            <p className="text-[11px] text-aa-text-secondary">
              Updates as you change tone and focus.
            </p>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_LLM_TUNING)}
        className="text-[12px] font-semibold text-aa-primary bg-transparent border-0 p-0 cursor-pointer">
        Reset to defaults
      </button>
    </div>
  )
}

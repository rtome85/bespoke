import {
  CARD_CLASS,
  DIVIDER_CLASS,
  OUTLINE_BUTTON_CLASS,
  SECTION_HEADING_CLASS
} from "~constants/options"
import { DEFAULT_LLM_TUNING, type LLMTuningConfig } from "~types/config"

interface Props {
  tuning: LLMTuningConfig
  onChange: (tuning: LLMTuningConfig) => void
}

const PARAMETERS = [
  {
    label: "Temperature",
    key: "temperature" as const,
    min: 0.1,
    max: 1.5,
    step: 0.1,
    format: (value: number) => value.toFixed(1),
    lowLabel: "0.1 — Precise",
    highLabel: "1.5 — Creative"
  },
  {
    label: "Top P",
    key: "topP" as const,
    min: 0.5,
    max: 1.0,
    step: 0.05,
    format: (value: number) => value.toFixed(2),
    lowLabel: "0.5 — Conservative",
    highLabel: "1.0 — Full diversity"
  },
  {
    label: "Max output tokens",
    key: "maxTokens" as const,
    min: 1024,
    max: 8192,
    step: 256,
    format: (value: number) => value.toLocaleString(),
    lowLabel: "1 024 — Concise",
    highLabel: "8 192 — Detailed"
  }
]

export function GenerationParametersCard({ tuning, onChange }: Props) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={SECTION_HEADING_CLASS}>Generation parameters</h2>
          <p className="text-sm text-aa-text-secondary -mt-1">
            Applied to every routed model. Defaults suit most cases.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_LLM_TUNING)}
          className={OUTLINE_BUTTON_CLASS}>
          Reset to defaults
        </button>
      </div>
      <hr className={DIVIDER_CLASS} />
      <div className="space-y-5">
        {PARAMETERS.map(
          ({ label, key, min, max, step, format, lowLabel, highLabel }) => {
            const inputId = `generation-parameter-${key}`
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-aa-text-primary">
                    {label}
                  </label>
                  <span className="text-sm font-mono font-semibold text-aa-primary-pressed">
                    {format(tuning[key])}
                  </span>
                </div>
                <input
                  id={inputId}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={tuning[key]}
                  onChange={(event) =>
                    onChange({
                      ...tuning,
                      [key]:
                        key === "maxTokens"
                          ? parseInt(event.target.value, 10)
                          : parseFloat(event.target.value)
                    })
                  }
                  className="w-full accent-aa-primary"
                />
                <div className="flex justify-between text-[10px] text-aa-text-secondary mt-0.5">
                  <span>{lowLabel}</span>
                  <span>{highLabel}</span>
                </div>
              </div>
            )
          }
        )}
      </div>
    </div>
  )
}

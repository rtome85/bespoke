import type { ReactNode } from "react"

import { Spectrum } from "~components/options/Spectrum"
import {
  BULLET_DENSITY,
  COVER_LETTER_SAMPLE,
  FOCUS,
  READING_LEVEL,
  SAMPLE_BULLETS,
  STRICTNESS,
  TONE
} from "~constants/options"
import {
  DEFAULT_LLM_TUNING,
  OUTPUT_LANGUAGE_META,
  OUTPUT_LANGUAGES,
  type LLMTuningConfig,
  type OutputLanguage
} from "~types/config"

interface Props {
  tuning: LLMTuningConfig
  onChange: (tuning: LLMTuningConfig) => void
}

function SettingRow({
  label,
  sub,
  children
}: {
  label: string
  sub: string
  children: ReactNode
}) {
  return (
    <div className="aa-settings-row">
      <div className="space-y-0.5">
        <p className="aa-settings-row-title">{label}</p>
        <p className="aa-settings-row-sub">{sub}</p>
      </div>
      {children}
    </div>
  )
}

function fallbackIndex(index: number) {
  return index < 0 ? 1 : index
}

export function OutputStyleSettingsScreen({ tuning, onChange }: Props) {
  const strictnessIndex = fallbackIndex(
    STRICTNESS.indexOf(tuning.matchStrictness)
  )
  const toneIndex = fallbackIndex(TONE.indexOf(tuning.writingTone))
  const focusIndex = fallbackIndex(FOCUS.indexOf(tuning.resumeFocus))
  const densityIndex = fallbackIndex(
    BULLET_DENSITY.indexOf(tuning.bulletDensity)
  )
  const readingIndex = fallbackIndex(READING_LEVEL.indexOf(tuning.readingLevel))
  // Configs saved before this setting existed carry no language at all.
  const languageValue =
    tuning.outputLanguage && OUTPUT_LANGUAGE_META[tuning.outputLanguage]
      ? tuning.outputLanguage
      : "auto"

  return (
    <div className="aa-card">
      <div className="flex gap-8">
        <div className="flex-1">
          <p className="aa-settings-section-label">SCORING</p>
          <SettingRow
            label="Match strictness"
            sub="How rigorously your profile is scored against the job's requirements">
            <Spectrum
              stops={["Rigorous", "Balanced", "Lenient"]}
              value={strictnessIndex}
              onChange={(index) =>
                onChange({
                  ...tuning,
                  matchStrictness: STRICTNESS[index] ?? tuning.matchStrictness
                })
              }
            />
          </SettingRow>

          <p className="aa-settings-section-label">WRITING</p>
          <SettingRow
            label="Language"
            sub="Language the CV and cover letter are written in">
            <div className="w-aa-px-460 max-w-full">
              <select
                id="output-language"
                aria-label="Document language"
                value={languageValue}
                onChange={(event) =>
                  onChange({
                    ...tuning,
                    outputLanguage: event.target.value as OutputLanguage
                  })
                }
                className="aa-input">
                {OUTPUT_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {OUTPUT_LANGUAGE_META[language].label}
                  </option>
                ))}
              </select>
              <p className="aa-hint">
                {languageValue === "auto"
                  ? "A Portuguese posting gets a Portuguese CV, a German posting a German one."
                  : `Always written in ${OUTPUT_LANGUAGE_META[languageValue].label}, whatever language the posting uses.`}
              </p>
            </div>
          </SettingRow>
          <SettingRow
            label="Tone"
            sub="Voice used across the CV and cover letter">
            <Spectrum
              stops={["Formal", "Professional", "Conversational"]}
              value={toneIndex}
              onChange={(index) =>
                onChange({
                  ...tuning,
                  writingTone: TONE[index] ?? tuning.writingTone
                })
              }
            />
          </SettingRow>
          <SettingRow
            label="Resume focus"
            sub="Which parts of your background get emphasis">
            <Spectrum
              stops={["Skills-first", "Balanced", "Experience-first"]}
              value={focusIndex}
              onChange={(index) =>
                onChange({
                  ...tuning,
                  resumeFocus: FOCUS[index] ?? tuning.resumeFocus
                })
              }
            />
          </SettingRow>
          <SettingRow
            label="Bullet density"
            sub="How much detail and evidence each bullet carries">
            <Spectrum
              stops={["Concise", "Standard", "Detailed"]}
              value={densityIndex}
              onChange={(index) =>
                onChange({
                  ...tuning,
                  bulletDensity: BULLET_DENSITY[index] ?? tuning.bulletDensity
                })
              }
            />
          </SettingRow>
          <SettingRow
            label="Reading level"
            sub="Vocabulary and sentence complexity">
            <Spectrum
              stops={["Simple", "Standard", "Advanced"]}
              value={readingIndex}
              onChange={(index) =>
                onChange({
                  ...tuning,
                  readingLevel: READING_LEVEL[index] ?? tuning.readingLevel
                })
              }
            />
          </SettingRow>
        </div>

        <div className="w-aa-px-300 shrink-0">
          <div className="rounded-aa-lg border border-aa-border bg-aa-surface p-aa-5 space-y-4">
            <p className="aa-settings-sample-label">SAMPLE BULLET</p>
            <p className="aa-settings-sample-body">
              {SAMPLE_BULLETS[tuning.writingTone][tuning.resumeFocus]}
            </p>
            <hr className="border-0 border-t border-aa-border" />
            <p className="aa-settings-sample-label">COVER LETTER OPENER</p>
            <p className="aa-settings-sample-body">{COVER_LETTER_SAMPLE}</p>
            <p className="text-aa-11 text-aa-text-secondary">
              Updates live as you change any setting on this page.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...tuning,
              matchStrictness: DEFAULT_LLM_TUNING.matchStrictness,
              writingTone: DEFAULT_LLM_TUNING.writingTone,
              resumeFocus: DEFAULT_LLM_TUNING.resumeFocus,
              bulletDensity: DEFAULT_LLM_TUNING.bulletDensity,
              readingLevel: DEFAULT_LLM_TUNING.readingLevel,
              outputLanguage: DEFAULT_LLM_TUNING.outputLanguage
            })
          }
          className="text-aa-caption font-semibold text-aa-primary bg-transparent border-0 p-0 cursor-pointer">
          Reset to defaults
        </button>
      </div>
    </div>
  )
}

import type { ReactNode } from "react"

import { Spectrum } from "~components/options/Spectrum"
import {
  BULLET_DENSITY,
  CARD_CLASS,
  COVER_LETTER_SAMPLE,
  FOCUS,
  READING_LEVEL,
  SAMPLE_BULLETS,
  STRICTNESS,
  TONE
} from "~constants/options"
import { DEFAULT_LLM_TUNING, type LLMTuningConfig } from "~types/config"

interface Props {
  tuning: LLMTuningConfig
  onChange: (tuning: LLMTuningConfig) => void
}

const SECTION_LABEL_CLASS =
  "text-[11px] font-bold tracking-[0.08em] text-aa-text-secondary pt-1"

const ROW_CLASS = "border-b border-aa-border-subtle py-3 space-y-3 first:pt-0"

const ROW_TITLE_CLASS = "text-[13px] font-medium text-aa-text-primary"

const ROW_SUB_CLASS = "text-[11px] leading-[1.4] text-aa-text-secondary"

const SAMPLE_LABEL_CLASS =
  "text-[10px] font-bold tracking-[0.05em] text-aa-text-secondary"

const SAMPLE_BODY_CLASS = "text-[13px] leading-relaxed text-aa-neutral-700"

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
    <div className={ROW_CLASS}>
      <div className="space-y-0.5">
        <p className={ROW_TITLE_CLASS}>{label}</p>
        <p className={ROW_SUB_CLASS}>{sub}</p>
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

  return (
    <div className={CARD_CLASS}>
      <div className="flex gap-8">
        <div className="flex-1">
          <p className={SECTION_LABEL_CLASS}>SCORING</p>
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

          <p className={SECTION_LABEL_CLASS}>WRITING</p>
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

        <div className="w-[300px] shrink-0">
          <div className="rounded-aa-lg border border-aa-border bg-aa-surface p-aa-5 space-y-4">
            <p className={SAMPLE_LABEL_CLASS}>SAMPLE BULLET</p>
            <p className={SAMPLE_BODY_CLASS}>
              {SAMPLE_BULLETS[tuning.writingTone][tuning.resumeFocus]}
            </p>
            <hr className="border-0 border-t border-aa-border" />
            <p className={SAMPLE_LABEL_CLASS}>COVER LETTER OPENER</p>
            <p className={SAMPLE_BODY_CLASS}>{COVER_LETTER_SAMPLE}</p>
            <p className="text-[11px] text-aa-text-secondary">
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
              readingLevel: DEFAULT_LLM_TUNING.readingLevel
            })
          }
          className="text-[12px] font-semibold text-aa-primary bg-transparent border-0 p-0 cursor-pointer">
          Reset to defaults
        </button>
      </div>
    </div>
  )
}

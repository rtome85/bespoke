import type { LLMTuningConfig, OutputLanguage } from "~types/config"

export const OUTPUT_LANGUAGE_META: Record<
  OutputLanguage,
  { label: string; name: string }
> = {
  auto: { label: "Match the job posting", name: "" },
  en: { label: "English", name: "English" },
  pt: { label: "Portuguese (Portugal)", name: "European Portuguese" },
  "pt-BR": { label: "Portuguese (Brazil)", name: "Brazilian Portuguese" },
  es: { label: "Spanish", name: "Spanish" },
  fr: { label: "French", name: "French" },
  de: { label: "German", name: "German" },
  it: { label: "Italian", name: "Italian" },
  nl: { label: "Dutch", name: "Dutch" }
}

export const OUTPUT_LANGUAGES = Object.keys(
  OUTPUT_LANGUAGE_META
) as OutputLanguage[]

export const DEFAULT_LLM_TUNING: LLMTuningConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  matchStrictness: "balanced",
  writingTone: "professional",
  resumeFocus: "balanced",
  bulletDensity: "standard",
  readingLevel: "standard",
  outputLanguage: "auto"
}

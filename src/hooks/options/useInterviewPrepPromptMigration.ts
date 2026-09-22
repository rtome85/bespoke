import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"

import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  DEFAULT_TECHNICAL_PREP_PROMPT,
  LEGACY_INTERVIEW_PREP_PROMPTS,
  LEGACY_TECHNICAL_PREP_PROMPTS
} from "~constants/prompts"
import { STORAGE_KEYS } from "~storage/keys"
import type { PerplexityConfig } from "~types/config"

/** The two prep prompts, each with the defaults it has shipped as. */
const PREP_PROMPTS = [
  {
    key: "interviewPrepPrompt" as const,
    current: DEFAULT_INTERVIEW_PREP_PROMPT,
    legacy: LEGACY_INTERVIEW_PREP_PROMPTS
  },
  {
    key: "technicalPrepPrompt" as const,
    current: DEFAULT_TECHNICAL_PREP_PROMPT,
    legacy: LEGACY_TECHNICAL_PREP_PROMPTS
  }
]

/**
 * Move users off a superseded default prep prompt.
 *
 * The prep generator already ignores a legacy default at call time, but the
 * Prompts page would still show the old text — an editor displaying something
 * that isn't what runs. Only an *exact* match for a previously shipped default
 * is replaced: anything else is the user's own writing and is never touched,
 * even though it can't produce the newer sections.
 */
export function useInterviewPrepPromptMigration(
  setPerplexityConfig: Dispatch<SetStateAction<PerplexityConfig>>
) {
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.PERPLEXITY_CONFIG, (result) => {
      const config = result[STORAGE_KEYS.PERPLEXITY_CONFIG] as
        | PerplexityConfig
        | undefined

      const upgrades: Partial<PerplexityConfig> = {}
      for (const { key, current, legacy } of PREP_PROMPTS) {
        const stored = config?.[key]
        if (stored && legacy.includes(stored)) upgrades[key] = current
      }
      if (!Object.keys(upgrades).length) return

      const next: PerplexityConfig = { ...config, ...upgrades }
      chrome.storage.local.set({ [STORAGE_KEYS.PERPLEXITY_CONFIG]: next })
      setPerplexityConfig(next)
    })
  }, [setPerplexityConfig])
}

import { useEffect } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  LEGACY_INTERVIEW_PREP_PROMPTS,
  type PerplexityConfig
} from "~types/config"

type StorageSetter<T> = (value: T | ((previous: T) => T)) => void

/**
 * Move users off a superseded default interview-prep prompt.
 *
 * The prep generator already ignores a legacy default at call time, but the
 * Prompts page would still show the old text — an editor displaying something
 * that isn't what runs. Only an *exact* match for a previously shipped default
 * is replaced: anything else is the user's own writing and is never touched,
 * even though it can't produce the newer sections.
 */
export function useInterviewPrepPromptMigration(
  setPerplexityConfig: StorageSetter<PerplexityConfig>
) {
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.PERPLEXITY_CONFIG, (result) => {
      const config = result[STORAGE_KEYS.PERPLEXITY_CONFIG] as
        | PerplexityConfig
        | undefined
      const stored = config?.interviewPrepPrompt
      if (!stored || !LEGACY_INTERVIEW_PREP_PROMPTS.includes(stored)) return

      const next: PerplexityConfig = {
        ...config,
        interviewPrepPrompt: DEFAULT_INTERVIEW_PREP_PROMPT
      }
      chrome.storage.local.set({ [STORAGE_KEYS.PERPLEXITY_CONFIG]: next })
      setPerplexityConfig(next)
    })
  }, [setPerplexityConfig])
}

import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"

import { DEFAULT_PROMPTS, PROMPTS_VERSION } from "~constants/prompts"
import { STORAGE_KEYS } from "~storage/keys"
import type { CustomPrompts } from "~types/config"

export function usePromptVersionMigration(
  setCustomPrompts: Dispatch<SetStateAction<CustomPrompts>>
) {
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.PROMPTS_VERSION, (result) => {
      if (result[STORAGE_KEYS.PROMPTS_VERSION] === PROMPTS_VERSION) return

      chrome.storage.local.set({
        [STORAGE_KEYS.CUSTOM_PROMPTS]: DEFAULT_PROMPTS,
        [STORAGE_KEYS.PROMPTS_VERSION]: PROMPTS_VERSION
      })
      setCustomPrompts(DEFAULT_PROMPTS)
    })
  }, [setCustomPrompts])
}

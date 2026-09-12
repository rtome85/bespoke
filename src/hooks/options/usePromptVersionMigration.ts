import { useEffect } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import {
  DEFAULT_PROMPTS,
  PROMPTS_VERSION,
  type CustomPrompts
} from "~types/config"

type StorageSetter<T> = (value: T | ((previous: T) => T)) => void

export function usePromptVersionMigration(
  setCustomPrompts: StorageSetter<CustomPrompts>
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

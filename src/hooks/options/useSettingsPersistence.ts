import type { Dispatch, SetStateAction } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import { DEFAULT_PROMPTS } from "~constants/prompts"
import { STORAGE_KEYS } from "~storage/keys"
import {
  type CustomPrompts,
  type LLMTuningConfig,
  type ModelRouting,
  type OllamaConfig,
  type PerplexityConfig,
  type ProvidersConfig,
  type SearchConfig
} from "~types/config"
import type { UserProfile } from "~types/userProfile"

const STATUS_DURATION_MS = 3_000

interface Args {
  ollamaConfig: OllamaConfig
  perplexityConfig: PerplexityConfig
  searchConfig: SearchConfig
  customPrompts: CustomPrompts
  userProfile: UserProfile
  llmTuning: LLMTuningConfig
  matchModel: string
  providers: ProvidersConfig
  modelRouting: ModelRouting
  setCustomPrompts: Dispatch<SetStateAction<CustomPrompts>>
}

export function useSettingsPersistence({
  ollamaConfig,
  perplexityConfig,
  searchConfig,
  customPrompts,
  userProfile,
  llmTuning,
  matchModel,
  providers,
  modelRouting,
  setCustomPrompts
}: Args) {
  const [saveStatus, setSaveStatus] = useState("")
  const statusTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(
    () => () => {
      statusTimersRef.current.forEach(clearTimeout)
      statusTimersRef.current.clear()
    },
    []
  )

  const showStatus = useCallback((message: string) => {
    setSaveStatus(message)
    const timer = setTimeout(() => {
      setSaveStatus("")
      statusTimersRef.current.delete(timer)
    }, STATUS_DURATION_MS)
    statusTimersRef.current.add(timer)
  }, [])

  const saveSettings = () => {
    chrome.storage.local.set({
      [STORAGE_KEYS.OLLAMA_CONFIG]: ollamaConfig,
      [STORAGE_KEYS.PERPLEXITY_CONFIG]: perplexityConfig,
      [STORAGE_KEYS.SEARCH_CONFIG]: searchConfig,
      [STORAGE_KEYS.CUSTOM_PROMPTS]: customPrompts,
      [STORAGE_KEYS.USER_PROFILE]: userProfile,
      [STORAGE_KEYS.LLM_TUNING]: llmTuning,
      [STORAGE_KEYS.LAST_SELECTED_MODEL]: matchModel,
      [STORAGE_KEYS.PROVIDERS]: providers,
      [STORAGE_KEYS.MODEL_ROUTING]: modelRouting
    })
    showStatus("Settings saved successfully!")
  }

  const resetPrompts = () => {
    if (!confirm("Reset all custom prompts to default?")) return
    setCustomPrompts(DEFAULT_PROMPTS)
    showStatus("Prompts reset to defaults")
  }

  return { saveStatus, showStatus, saveSettings, resetPrompts }
}

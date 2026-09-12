import { useLegacyProviderMigration } from "~hooks/options/useLegacyProviderMigration"
import { usePromptVersionMigration } from "~hooks/options/usePromptVersionMigration"
import { useDebouncedStorage } from "~lib/useDebouncedStorage"
import { STORAGE_KEYS } from "~storage/keys"
import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  DEFAULT_LLM_TUNING,
  DEFAULT_MODEL_ROUTING,
  DEFAULT_PERPLEXITY_PROMPT,
  DEFAULT_PROMPTS,
  type CustomPrompts,
  type LLMTuningConfig,
  type ModelRouting,
  type OllamaConfig,
  type PerplexityConfig,
  type ProvidersConfig
} from "~types/config"
import { DEFAULT_USER_PROFILE, type UserProfile } from "~types/userProfile"

export function useOptionsStoredState() {
  const [userProfile, setUserProfile] = useDebouncedStorage<UserProfile>(
    STORAGE_KEYS.USER_PROFILE,
    DEFAULT_USER_PROFILE
  )
  const [ollamaConfig, setOllamaConfig] = useDebouncedStorage<OllamaConfig>(
    STORAGE_KEYS.OLLAMA_CONFIG,
    {
      apiKey: "",
      baseUrl: "https://ollama.com/api",
      enabled: false
    }
  )
  const [perplexityConfig, setPerplexityConfig] =
    useDebouncedStorage<PerplexityConfig>(STORAGE_KEYS.PERPLEXITY_CONFIG, {
      apiKey: "",
      enabled: false,
      customPrompt: DEFAULT_PERPLEXITY_PROMPT,
      interviewPrepPrompt: DEFAULT_INTERVIEW_PREP_PROMPT
    })
  const [customPrompts, setCustomPrompts] = useDebouncedStorage<CustomPrompts>(
    STORAGE_KEYS.CUSTOM_PROMPTS,
    DEFAULT_PROMPTS
  )
  const [llmTuning, setLlmTuning] = useDebouncedStorage<LLMTuningConfig>(
    STORAGE_KEYS.LLM_TUNING,
    DEFAULT_LLM_TUNING
  )
  const [matchModel, setMatchModel] = useDebouncedStorage<string>(
    STORAGE_KEYS.LAST_SELECTED_MODEL,
    "gpt-oss:20b-cloud"
  )
  const [providers, setProviders] = useDebouncedStorage<ProvidersConfig>(
    STORAGE_KEYS.PROVIDERS,
    {}
  )
  const [modelRouting, setModelRouting] = useDebouncedStorage<ModelRouting>(
    STORAGE_KEYS.MODEL_ROUTING,
    DEFAULT_MODEL_ROUTING
  )

  useLegacyProviderMigration(setProviders, setModelRouting)
  usePromptVersionMigration(setCustomPrompts)

  return {
    userProfile,
    setUserProfile,
    ollamaConfig,
    setOllamaConfig,
    perplexityConfig,
    setPerplexityConfig,
    customPrompts,
    setCustomPrompts,
    llmTuning,
    setLlmTuning,
    matchModel,
    setMatchModel,
    providers,
    setProviders,
    modelRouting,
    setModelRouting
  }
}

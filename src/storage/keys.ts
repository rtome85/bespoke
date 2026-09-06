export const STORAGE_KEYS = {
  PROVIDER: "provider",
  USER_PROFILE: "userProfile",
  OLLAMA_CONFIG: "ollamaConfig",
  WEBHOOK_URL: "webhookUrl",
  CUSTOM_PROMPTS: "customPrompts",
  LAST_SELECTED_MODEL: "lastSelectedModel",
  PENDING_JOB_DATA: "pendingJobData",
  SAVED_APPLICATIONS: "savedApplications",
  LLM_TUNING: "llmTuning",
  SYNC_CONFIG: "syncConfig",
  PROVIDERS: "providers",
  MODEL_ROUTING: "modelRouting",
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// Keys included in Google Drive sync (excludes temporary/auth data)
export const SYNC_KEYS = [
  "userProfile",
  "ollamaConfig",
  "perplexityConfig",
  "customPrompts",
  "llmTuning",
  "savedApplications",
  "providers",
  "modelRouting",
] as const

export type SyncKey = typeof SYNC_KEYS[number]

export const STORAGE_KEYS = {
  PROVIDER: "provider",
  USER_PROFILE: "userProfile",
  OLLAMA_CONFIG: "ollamaConfig",
  WEBHOOK_URL: "webhookUrl",
  CUSTOM_PROMPTS: "customPrompts",
  LAST_SELECTED_MODEL: "lastSelectedModel",
  PENDING_JOB_DATA: "pendingJobData",
  SAVED_APPLICATIONS: "savedApplications",
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

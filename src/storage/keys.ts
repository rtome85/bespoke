export const STORAGE_KEYS = {
  PROVIDER: "provider",
  USER_PROFILE: "userProfile",
  OLLAMA_CONFIG: "ollamaConfig",
  PERPLEXITY_CONFIG: "perplexityConfig",
  WEBHOOK_URL: "webhookUrl",
  CUSTOM_PROMPTS: "customPrompts",
  PROMPTS_VERSION: "promptsVersion",
  LAST_SELECTED_MODEL: "lastSelectedModel",
  PENDING_JOB_DATA: "pendingJobData",
  SAVED_APPLICATIONS: "savedApplications",
  LLM_TUNING: "llmTuning",
  SYNC_CONFIG: "syncConfig",
  PROVIDERS: "providers",
  MODEL_ROUTING: "modelRouting",
  INTERVIEWS_SCHEMA_VERSION: "interviewsSchemaVersion",
  COMPANY_RESEARCH_CACHE: "companyResearchCache",
  INTERVIEW_REMINDERS_ENABLED: "interviewRemindersEnabled",
  LAST_ROUTE: "lastRoute",
  DOCUMENT_PREVIEW_DRAFT: "documentPreviewDraft",
} as const

/** Current interviews data-schema version (see interviews/migrate). */
export const INTERVIEWS_SCHEMA_VERSION = 1

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// Keys included in Google Drive sync (excludes temporary/auth data)
export const SYNC_KEYS = [
  "userProfile",
  "ollamaConfig",
  STORAGE_KEYS.PERPLEXITY_CONFIG,
  "customPrompts",
  // Travels with `customPrompts`: it describes that value's schema, so a
  // restore can tell whether the synced prompts predate the current
  // defaults instead of trusting the local marker (see
  // usePromptVersionMigration).
  STORAGE_KEYS.PROMPTS_VERSION,
  "llmTuning",
  "savedApplications",
  // Travels with `savedApplications`: it describes that array's shape, so a
  // restore can tell a pre-migration backup from one written by a newer schema
  // instead of guessing (see interviews/migrate).
  "interviewsSchemaVersion",
  "providers",
  "modelRouting",
] as const

export type SyncKey = typeof SYNC_KEYS[number]

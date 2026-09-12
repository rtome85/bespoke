import { migrateRestoredApplications } from "~lib/interviews/migrate"
import { STORAGE_KEYS } from "~storage/keys"
import { mutateSavedApplications } from "~storage/savedApplications"
import type {
  CustomPrompts,
  LLMTuningConfig,
  ModelRouting,
  OllamaConfig,
  PerplexityConfig,
  ProvidersConfig
} from "~types/config"
import type { SavedApplication, UserProfile } from "~types/userProfile"

type StorageSetter<T> = (value: T | ((previous: T) => T)) => void

interface Args {
  ollamaConfig: OllamaConfig
  perplexityConfig: PerplexityConfig
  providers: ProvidersConfig
  modelRouting: ModelRouting
  customPrompts: CustomPrompts
  userProfile: UserProfile
  llmTuning: LLMTuningConfig
  matchModel: string
  setOllamaConfig: StorageSetter<OllamaConfig>
  setPerplexityConfig: StorageSetter<PerplexityConfig>
  setProviders: StorageSetter<ProvidersConfig>
  setModelRouting: StorageSetter<ModelRouting>
  setCustomPrompts: StorageSetter<CustomPrompts>
  setUserProfile: StorageSetter<UserProfile>
  setLlmTuning: StorageSetter<LLMTuningConfig>
  setMatchModel: StorageSetter<string>
  showStatus: (message: string) => void
}

interface ImportData {
  exportDate?: string
  ollamaConfig?: OllamaConfig
  perplexityConfig?: PerplexityConfig
  providers?: ProvidersConfig
  modelRouting?: ModelRouting
  customPrompts?: CustomPrompts
  userProfile?: UserProfile
  llmTuning?: LLMTuningConfig
  lastSelectedModel?: string
  savedApplications?: SavedApplication[]
  interviewsSchemaVersion?: number
  promptsVersion?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isValidOllamaConfig(value: unknown): value is OllamaConfig {
  return (
    isRecord(value) &&
    typeof value.apiKey === "string" &&
    typeof value.baseUrl === "string" &&
    typeof value.enabled === "boolean"
  )
}

function isValidPerplexityConfig(value: unknown): value is PerplexityConfig {
  return (
    isRecord(value) &&
    typeof value.apiKey === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.customPrompt === "string" &&
    (value.interviewPrepPrompt === undefined ||
      typeof value.interviewPrepPrompt === "string")
  )
}

function isValidProviderConfig(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.apiKey === "string" &&
    typeof value.enabled === "boolean" &&
    (value.baseUrl === undefined || typeof value.baseUrl === "string") &&
    (value.models === undefined || isStringArray(value.models))
  )
}

function isValidProvidersConfig(value: unknown): value is ProvidersConfig {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (provider) => provider === undefined || isValidProviderConfig(provider)
    )
  )
}

function isValidRouteTarget(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.provider === "string" &&
    typeof value.model === "string"
  )
}

function isValidModelRouting(value: unknown): value is ModelRouting {
  return (
    isRecord(value) &&
    isValidRouteTarget(value.scoring) &&
    isValidRouteTarget(value.drafting) &&
    isRecord(value.fallback) &&
    typeof value.fallback.enabled === "boolean" &&
    isValidRouteTarget(value.fallback.target)
  )
}

function isValidCustomPrompts(value: unknown): value is CustomPrompts {
  return (
    isRecord(value) &&
    typeof value.resumeSystemPrompt === "string" &&
    typeof value.resumeUserPromptTemplate === "string" &&
    typeof value.coverLetterSystemPrompt === "string" &&
    typeof value.coverLetterUserPromptTemplate === "string"
  )
}

function isValidLlmTuning(value: unknown): value is LLMTuningConfig {
  return (
    isRecord(value) &&
    typeof value.temperature === "number" &&
    typeof value.topP === "number" &&
    typeof value.maxTokens === "number" &&
    typeof value.matchStrictness === "string" &&
    typeof value.writingTone === "string" &&
    typeof value.resumeFocus === "string"
  )
}

function isValidUserProfile(value: unknown): value is UserProfile {
  return (
    isRecord(value) &&
    isRecord(value.personalInfo) &&
    Array.isArray(value.education) &&
    Array.isArray(value.certificates) &&
    Array.isArray(value.skills) &&
    Array.isArray(value.workExperience) &&
    Array.isArray(value.personalProjects) &&
    Array.isArray(value.languages)
  )
}

/**
 * Structural check only — a legacy status string ("HR Interview") or a
 * dropped field (`preparationPlan`, `isFavorite`) is still valid here.
 * `migrateRestoredApplications` repairs those shapes after import; this
 * guard only has to keep out data that isn't a `SavedApplication` at all.
 */
function isValidSavedApplication(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.company === "string" &&
    typeof value.jobTitle === "string" &&
    typeof value.status === "string" &&
    typeof value.date === "string" &&
    typeof value.createdAt === "string" &&
    (value.rounds === undefined || Array.isArray(value.rounds)) &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    (value.matchStrengths === undefined || isStringArray(value.matchStrengths)) &&
    (value.matchWeaknesses === undefined ||
      isStringArray(value.matchWeaknesses)) &&
    (value.matchImprovements === undefined ||
      isStringArray(value.matchImprovements))
  )
}

/**
 * Validates the whole parsed backup up front so a partially-malformed file
 * can't apply some fields and reject others — either every present field is
 * well-formed and the import proceeds, or nothing is mutated at all.
 */
function validateImportData(value: unknown): ImportData | null {
  if (!isRecord(value)) return null
  if (value.exportDate !== undefined && typeof value.exportDate !== "string")
    return null
  if (value.ollamaConfig !== undefined && !isValidOllamaConfig(value.ollamaConfig))
    return null
  if (
    value.perplexityConfig !== undefined &&
    !isValidPerplexityConfig(value.perplexityConfig)
  )
    return null
  if (value.providers !== undefined && !isValidProvidersConfig(value.providers))
    return null
  if (value.modelRouting !== undefined && !isValidModelRouting(value.modelRouting))
    return null
  if (
    value.customPrompts !== undefined &&
    !isValidCustomPrompts(value.customPrompts)
  )
    return null
  if (value.userProfile !== undefined && !isValidUserProfile(value.userProfile))
    return null
  if (value.llmTuning !== undefined && !isValidLlmTuning(value.llmTuning))
    return null
  if (
    value.lastSelectedModel !== undefined &&
    typeof value.lastSelectedModel !== "string"
  )
    return null
  if (
    value.savedApplications !== undefined &&
    !(
      Array.isArray(value.savedApplications) &&
      value.savedApplications.every(isValidSavedApplication)
    )
  )
    return null
  if (
    value.interviewsSchemaVersion !== undefined &&
    typeof value.interviewsSchemaVersion !== "number"
  )
    return null
  if (
    value.promptsVersion !== undefined &&
    typeof value.promptsVersion !== "string"
  )
    return null

  return value as ImportData
}

export function useDataTransfer({
  ollamaConfig,
  perplexityConfig,
  providers,
  modelRouting,
  customPrompts,
  userProfile,
  llmTuning,
  matchModel,
  setOllamaConfig,
  setPerplexityConfig,
  setProviders,
  setModelRouting,
  setCustomPrompts,
  setUserProfile,
  setLlmTuning,
  setMatchModel,
  showStatus
}: Args) {
  const exportData = async () => {
    try {
      const stored = await chrome.storage.local.get([
        STORAGE_KEYS.SAVED_APPLICATIONS,
        STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION,
        STORAGE_KEYS.PROMPTS_VERSION
      ])
      const data = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        ollamaConfig,
        perplexityConfig,
        providers,
        modelRouting,
        customPrompts,
        userProfile,
        llmTuning,
        lastSelectedModel: matchModel,
        savedApplications: stored[STORAGE_KEYS.SAVED_APPLICATIONS] ?? [],
        interviewsSchemaVersion: stored[STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION],
        promptsVersion: stored[STORAGE_KEYS.PROMPTS_VERSION]
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `bespoke-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      showStatus("Data exported successfully!")
    } catch (error) {
      alert("Failed to export data: " + error)
    }
  }

  const importData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      try {
        const data = validateImportData(JSON.parse(await file.text()))
        if (!data) {
          alert(
            "Failed to import data: file does not match the expected backup format"
          )
          return
        }
        const dateLabel = data.exportDate
          ? new Date(data.exportDate).toLocaleDateString()
          : "unknown date"

        if (
          !confirm(
            `Import data from ${dateLabel}? This will overwrite your current settings and profile.`
          )
        ) {
          return
        }

        if (data.ollamaConfig) setOllamaConfig(data.ollamaConfig)
        if (data.perplexityConfig) setPerplexityConfig(data.perplexityConfig)
        if (data.providers) setProviders(data.providers)
        if (data.modelRouting) setModelRouting(data.modelRouting)
        if (data.customPrompts) {
          setCustomPrompts(data.customPrompts)
          if (data.promptsVersion !== undefined) {
            await chrome.storage.local.set({
              [STORAGE_KEYS.PROMPTS_VERSION]: data.promptsVersion
            })
          }
        }
        if (data.userProfile) setUserProfile(data.userProfile)
        if (data.llmTuning) setLlmTuning(data.llmTuning)
        if (data.lastSelectedModel) setMatchModel(data.lastSelectedModel)
        const restoredApplications = data.savedApplications
        if (restoredApplications) {
          await mutateSavedApplications(() => restoredApplications)
          await migrateRestoredApplications(data.interviewsSchemaVersion)
        }

        showStatus("Data imported successfully!")
      } catch {
        alert("Failed to import data: Invalid JSON format")
      }
    }

    input.click()
  }

  return { exportData, importData }
}

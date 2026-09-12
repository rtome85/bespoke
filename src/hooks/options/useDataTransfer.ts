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
        STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION
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
        interviewsSchemaVersion: stored[STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION]
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
        const data = JSON.parse(await file.text()) as ImportData
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
        if (data.customPrompts) setCustomPrompts(data.customPrompts)
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

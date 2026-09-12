import type { LucideIcon } from "lucide-react"

import type { CustomPrompts, LLMProviderId } from "~types/config"
import type {
  InterviewRound,
  RoundType,
  SavedApplication
} from "~types/userProfile"

export type AppSection = "applications" | "settings"

export interface AddRoundEditRef {
  app: SavedApplication
  round: InterviewRound
}

export type RoundDrawerState =
  | {
      mode: "create"
      editRef?: undefined
      presetAppId?: string
      presetType?: RoundType | ""
    }
  | { mode: "edit"; editRef: AddRoundEditRef }
  | null

export type SettingsNavItem = {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
  /** Optional count shown right-aligned on the row (hidden when nullish). */
  badge?: string | number
}

export type SettingsNavGroup = {
  label: string
  items: SettingsNavItem[]
}

export type ProviderTestResult = {
  type: "idle" | "loading" | "ok" | "err"
  message: string
}

export type ProviderTestState = Partial<
  Record<LLMProviderId, ProviderTestResult>
>

export type OperationStatus = {
  type: "idle" | "loading" | "success" | "error"
  message: string
}

export type PromptDialogState = {
  isOpen: boolean
  title: string
  promptKey: keyof CustomPrompts | null
}

export type PerplexityPromptType = "research" | "preparation"

export type PerplexityDialogState = {
  isOpen: boolean
  title: string
  promptType: PerplexityPromptType | null
}

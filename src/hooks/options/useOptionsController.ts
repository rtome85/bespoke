import { useState } from "react"

import { NAV_GROUPS, SETTINGS_DEFAULT_TAB } from "~constants/options"
import { useApplicationActions } from "~hooks/options/useApplicationActions"
import { useDataTransfer } from "~hooks/options/useDataTransfer"
import { useDriveSync } from "~hooks/options/useDriveSync"
import { useInterviewReminders } from "~hooks/options/useInterviewReminders"
import { useOptionsStoredState } from "~hooks/options/useOptionsStoredState"
import { usePerplexityConnectionTest } from "~hooks/options/usePerplexityConnectionTest"
import { usePromptConfiguration } from "~hooks/options/usePromptConfiguration"
import { useProviderTesting } from "~hooks/options/useProviderTesting"
import { useSettingsPersistence } from "~hooks/options/useSettingsPersistence"
import { useSyncConfig } from "~hooks/options/useSyncConfig"
import { useHashRoute } from "~lib/router"
import { useSavedApplications } from "~lib/useSavedApplications"
import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  type LLMProviderId,
  type ProviderConfig
} from "~types/config"
import type {
  AddRoundEditRef,
  AppSection,
  RoundDrawerState
} from "~types/options"

export function useOptionsController() {
  const { route, navigate } = useHashRoute()
  const apps = useSavedApplications()
  const [roundDrawer, setRoundDrawer] = useState<RoundDrawerState>(null)
  const [advanceFor, setAdvanceFor] = useState<string | null>(null)
  const [openProvider, setOpenProvider] = useState<string | null>("ollama")

  const stored = useOptionsStoredState()
  const {
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
  } = stored

  const section: AppSection =
    route.area === "settings" ? "settings" : "applications"
  const allNavItems = NAV_GROUPS.flatMap((group) => group.items)
  const activeTab = allNavItems.some((item) => item.value === route.view)
    ? route.view
    : SETTINGS_DEFAULT_TAB
  const activeNav = allNavItems.find((item) => item.value === activeTab)

  const changeSection = (next: AppSection) =>
    navigate(next === "settings" ? "#/settings" : "#/applications")

  const updateProvider = (id: LLMProviderId, patch: Partial<ProviderConfig>) =>
    setProviders((current) => ({
      ...current,
      [id]: {
        apiKey: "",
        enabled: true,
        ...current[id],
        ...patch
      }
    }))

  const { providerTest, testProvider, refreshProviderModels } =
    useProviderTesting({ providers, updateProvider })
  const { status: perplexityTestStatus, testConnection: testPerplexity } =
    usePerplexityConnectionTest(perplexityConfig)
  const { remindersOn, toggleReminders } = useInterviewReminders(apps)
  const syncConfig = useSyncConfig()
  const { syncStatus, connectDrive, forcePull, disconnectDrive } =
    useDriveSync(syncConfig)
  const { saveStatus, showStatus, saveSettings, resetPrompts } =
    useSettingsPersistence({
      ollamaConfig,
      perplexityConfig,
      customPrompts,
      userProfile,
      llmTuning,
      matchModel,
      providers,
      modelRouting,
      setCustomPrompts
    })
  const promptConfiguration = usePromptConfiguration({
    customPrompts,
    perplexityConfig,
    setCustomPrompts,
    setPerplexityConfig
  })
  const { exportData, importData } = useDataTransfer({
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
  })
  const { updateApplication, deleteApplication, openApplicationsWindow } =
    useApplicationActions()

  const openCreateRound = () => setRoundDrawer({ mode: "create" })
  const openEditRound = (editRef: AddRoundEditRef) =>
    setRoundDrawer({ mode: "edit", editRef })
  const closeRoundDrawer = () => setRoundDrawer(null)
  const handleDebriefSaved = ({
    advanced,
    appId
  }: {
    advanced: boolean
    appId: string
  }) => {
    navigate("#/interviews/debriefs")
    if (advanced) setAdvanceFor(appId)
  }
  const addAdvancedRound = () => {
    if (!advanceFor) return
    setRoundDrawer({
      mode: "create",
      presetAppId: advanceFor,
      presetType: ""
    })
    setAdvanceFor(null)
  }

  const dialogPrompt = promptConfiguration.dialogState.promptKey
    ? customPrompts[promptConfiguration.dialogState.promptKey]
    : ""
  const perplexityDialogPrompt =
    promptConfiguration.perplexityDialogState.promptType === "research"
      ? perplexityConfig.customPrompt
      : promptConfiguration.perplexityDialogState.promptType === "preparation"
        ? perplexityConfig.interviewPrepPrompt ?? DEFAULT_INTERVIEW_PREP_PROMPT
        : ""

  return {
    navigation: {
      route,
      navigate,
      section,
      activeTab,
      activeNav,
      changeSection
    },
    applications: {
      apps,
      roundDrawer,
      advanceFor,
      openCreateRound,
      openEditRound,
      closeRoundDrawer,
      handleDebriefSaved,
      addAdvancedRound,
      dismissAdvance: () => setAdvanceFor(null),
      updateApplication,
      deleteApplication,
      openApplicationsWindow
    },
    settings: {
      userProfile,
      setUserProfile,
      perplexityConfig,
      setPerplexityConfig,
      customPrompts,
      llmTuning,
      setLlmTuning,
      providers,
      modelRouting,
      setModelRouting,
      openProvider,
      setOpenProvider,
      updateProvider,
      providerTest,
      testProvider,
      refreshProviderModels,
      perplexityTestStatus,
      testPerplexity,
      remindersOn,
      toggleReminders,
      syncConfig,
      syncStatus,
      connectDrive,
      forcePull,
      disconnectDrive,
      saveStatus,
      saveSettings,
      resetPrompts,
      exportData,
      importData,
      dialogPrompt,
      perplexityDialogPrompt,
      ...promptConfiguration
    }
  }
}

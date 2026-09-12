import type { ReactNode } from "react"

import { AppBar } from "~components/AppBar"
import { ApplicationsArea } from "~components/options/ApplicationsArea"
import { BackupSyncSettingsScreen } from "~components/options/BackupSyncSettingsScreen"
import { ModelRoutingSettingsScreen } from "~components/options/ModelRoutingSettingsScreen"
import { OptionsOverlays } from "~components/options/OptionsOverlays"
import { OutputStyleSettingsScreen } from "~components/options/OutputStyleSettingsScreen"
import { ProfileSettingsScreen } from "~components/options/ProfileSettingsScreen"
import { PromptsSettingsScreen } from "~components/options/PromptsSettingsScreen"
import { ProvidersSettingsScreen } from "~components/options/ProvidersSettingsScreen"
import { SettingsArea } from "~components/options/SettingsArea"
import { useOptionsController } from "~hooks/options/useOptionsController"
import { DEFAULT_LLM_TUNING } from "~types/config"

import "./style.css"

function Options() {
  const { navigation, applications, settings } = useOptionsController()
  const { route, navigate, section, activeTab, activeNav, changeSection } =
    navigation
  const {
    apps,
    roundDrawer,
    advanceFor,
    openCreateRound,
    openEditRound,
    closeRoundDrawer,
    handleDebriefSaved,
    addAdvancedRound,
    dismissAdvance,
    updateApplication,
    deleteApplication,
    openApplicationsWindow
  } = applications
  const {
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
    dialogState,
    dialogPrompt,
    perplexityDialogState,
    perplexityDialogPrompt,
    activeTemplateName,
    changePrompt,
    openPromptDialog,
    closePromptDialog,
    savePromptFromDialog,
    openPerplexityDialog,
    closePerplexityDialog,
    savePerplexityPromptFromDialog,
    applyTemplate,
    updateProvider
  } = settings

  const tabContent: Record<string, ReactNode> = {
    "providers": (
      <ProvidersSettingsScreen
        providers={providers}
        perplexityConfig={perplexityConfig}
        openProvider={openProvider}
        providerTest={providerTest}
        perplexityTestStatus={perplexityTestStatus}
        onOpenProvider={setOpenProvider}
        onUpdateProvider={updateProvider}
        onTestProvider={testProvider}
        onRefreshProviderModels={refreshProviderModels}
        onChangePerplexity={setPerplexityConfig}
        onTestPerplexity={testPerplexity}
        onOpenPrompts={() => navigate("#/settings/prompts")}
      />
    ),
    "model-routing": (
      <ModelRoutingSettingsScreen
        providers={providers}
        modelRouting={modelRouting}
        tuning={llmTuning ?? DEFAULT_LLM_TUNING}
        onChangeModelRouting={setModelRouting}
        onChangeTuning={setLlmTuning}
        onOpenProviders={() => navigate("#/settings/providers")}
      />
    ),
    "prompts": (
      <PromptsSettingsScreen
        customPrompts={customPrompts}
        perplexityConfig={perplexityConfig}
        activeTemplateName={activeTemplateName}
        onApplyTemplate={applyTemplate}
        onResetPrompts={resetPrompts}
        onChangePrompt={changePrompt}
        onChangePerplexity={setPerplexityConfig}
        onOpenPrompt={openPromptDialog}
        onOpenPerplexityPrompt={openPerplexityDialog}
      />
    ),
    "output-style": (
      <OutputStyleSettingsScreen
        tuning={llmTuning ?? DEFAULT_LLM_TUNING}
        onChange={setLlmTuning}
      />
    ),
    "personal-info": (
      <ProfileSettingsScreen
        view="personal-info"
        userProfile={userProfile}
        onChange={setUserProfile}
      />
    ),
    "education": (
      <ProfileSettingsScreen
        view="education"
        userProfile={userProfile}
        onChange={setUserProfile}
      />
    ),
    "skills": (
      <ProfileSettingsScreen
        view="skills"
        userProfile={userProfile}
        onChange={setUserProfile}
      />
    ),
    "experience": (
      <ProfileSettingsScreen
        view="experience"
        userProfile={userProfile}
        onChange={setUserProfile}
      />
    ),
    "projects": (
      <ProfileSettingsScreen
        view="projects"
        userProfile={userProfile}
        onChange={setUserProfile}
      />
    ),
    "languages": (
      <ProfileSettingsScreen
        view="languages"
        userProfile={userProfile}
        onChange={setUserProfile}
      />
    ),
    "backup-sync": (
      <BackupSyncSettingsScreen
        remindersOn={remindersOn}
        syncConfig={syncConfig}
        syncStatus={syncStatus}
        onToggleReminders={toggleReminders}
        onConnectDrive={connectDrive}
        onForcePull={forcePull}
        onDisconnectDrive={disconnectDrive}
        onExportData={exportData}
        onImportData={importData}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-aa-neutral-50 font-aa text-aa-text-primary">
        <AppBar
          section={section}
          onSection={changeSection}
          email={userProfile.personalInfo?.email || undefined}
        />

        {section === "settings" ? (
          <SettingsArea
            activeTab={activeTab}
            activeNav={activeNav}
            saveStatus={saveStatus}
            onSelect={(value) => navigate(`#/settings/${value}`)}
            onSave={saveSettings}>
            {tabContent[activeTab]}
          </SettingsArea>
        ) : (
          <ApplicationsArea
            route={route}
            apps={apps}
            onNavigate={navigate}
            onAddRound={openCreateRound}
            onEditRound={openEditRound}
            onDebriefSaved={handleDebriefSaved}
            onUpdateApplication={updateApplication}
            onDeleteApplication={deleteApplication}
            onOpenApplicationsWindow={openApplicationsWindow}
          />
        )}
      </div>

      <OptionsOverlays
        apps={apps}
        roundDrawer={roundDrawer}
        showAdvancePrompt={Boolean(advanceFor)}
        dialogState={dialogState}
        dialogPrompt={dialogPrompt}
        perplexityDialogState={perplexityDialogState}
        perplexityDialogPrompt={perplexityDialogPrompt}
        onCloseDialog={closePromptDialog}
        onSaveDialog={savePromptFromDialog}
        onClosePerplexityDialog={closePerplexityDialog}
        onSavePerplexityDialog={savePerplexityPromptFromDialog}
        onCloseRoundDrawer={closeRoundDrawer}
        onAddAdvancedRound={addAdvancedRound}
        onDismissAdvance={dismissAdvance}
      />
    </>
  )
}

export default Options

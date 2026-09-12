import { useRef, useState } from "react"

import { AnalysisSplash } from "~components/dialog/AnalysisSplash"
import { MatchFormScreen } from "~components/dialog/MatchFormScreen"
import { MatchReportScreen } from "~components/dialog/MatchReportScreen"
import { SaveApplicationScreen } from "~components/dialog/SaveApplicationScreen"
import { QUOTES } from "~constants/dialog"
import { useApplicationForm } from "~hooks/dialog/useApplicationForm"
import { useCompanyResearch } from "~hooks/dialog/useCompanyResearch"
import { useDialogStoredState } from "~hooks/dialog/useDialogStoredState"
import { useDocumentGeneration } from "~hooks/dialog/useDocumentGeneration"
import { useMatchAnalysis } from "~hooks/dialog/useMatchAnalysis"
import { closeSidePanel } from "~lib/dialog/navigation"
import type { DialogView, MatchAccordionSection } from "~types/dialog"

import "../style.css"

function IndexDialog() {
  const initialView = useRef(
    new URLSearchParams(window.location.search).get("view") as DialogView | null
  ).current
  const [view, setView] = useState<DialogView>(initialView ?? "form")
  const {
    routingLabels,
    userProfile,
    setUserProfile,
    setSavedApplications,
    perplexityConfig,
    initialPendingJobData
  } = useDialogStoredState()
  const {
    companyName,
    setCompanyName,
    jobTitle,
    setJobTitle,
    jobDescription,
    setJobDescription,
    pendingJobUrl,
    status,
    loading,
    result,
    setResult,
    triageDecision,
    setTriageDecision,
    addedGapSkills,
    progress,
    quoteIndex,
    quoteVisible,
    submit: handleSubmit,
    addGapSkill: handleAddGapSkill
  } = useMatchAnalysis({
    initialView,
    initialPendingJobData,
    view,
    setView,
    userProfile,
    setUserProfile
  })
  const { companyInfo, companyInfoLoading } = useCompanyResearch(
    companyName,
    Boolean(result),
    perplexityConfig
  )
  const [projectsExpanded, setProjectsExpanded] = useState(false)
  const [matchAccordionOpen, setMatchAccordionOpen] =
    useState<MatchAccordionSection | null>("strengths")
  const {
    editingApplication,
    setEditingApplication,
    formData: saveFormData,
    setFormData: setSaveFormData,
    saveDocuments: saveDocs,
    setSaveDocuments: setSaveDocs,
    error: saveFormError,
    openForm: openSaveForm,
    saveApplication: handleSaveApplication
  } = useApplicationForm({
    companyName,
    jobTitle,
    jobDescription,
    pendingJobUrl,
    result,
    setView,
    setSavedApplications
  })
  const {
    documentsLoading: docsLoading,
    documentsProgress: docsProgress,
    documentsError: docsError,
    generatingDocumentsForApplication: generatingDocsForApp,
    applicationDocumentsError: docsGenError,
    previewError,
    generateDocuments: handleGenerateDocuments,
    generateDocumentsForApplication,
    openDocumentPreview: handleOpenDocumentPreview
  } = useDocumentGeneration({
    companyName,
    jobTitle,
    jobDescription,
    userProfile,
    analysisLoading: loading,
    setResult,
    editingApplication,
    setEditingApplication,
    setSavedApplications
  })

  if (view === "extracting") {
    return (
      <AnalysisSplash
        title="Extracting job details…"
        subtitle="Reading the job posting with AI"
        progress={progress}
        quote={QUOTES[quoteIndex]}
        quoteVisible={quoteVisible}
      />
    )
  }

  if (view === "loading") {
    return (
      <AnalysisSplash
        title="Analyzing your match…"
        subtitle="Scoring your profile against the job"
        progress={progress}
        quote={QUOTES[quoteIndex]}
        quoteVisible={quoteVisible}
      />
    )
  }

  // Success screen
  if (view === "success" && result) {
    return (
      <MatchReportScreen
        fullName={userProfile.personalInfo?.fullName ?? ""}
        companyName={companyName}
        jobTitle={jobTitle}
        result={result}
        triageDecision={triageDecision}
        openMatchSection={matchAccordionOpen}
        companyInfo={companyInfo}
        companyInfoLoading={companyInfoLoading}
        projectsExpanded={projectsExpanded}
        addedGapSkills={addedGapSkills}
        documentsLoading={docsLoading}
        documentsProgress={docsProgress}
        documentsError={docsError}
        previewError={previewError}
        onToggleMatchSection={(section) =>
          setMatchAccordionOpen((current) =>
            current === section ? null : section
          )
        }
        onToggleProjects={() => setProjectsExpanded((current) => !current)}
        onApply={() => setTriageDecision("apply")}
        onSaveForLater={() => openSaveForm()}
        onDiscard={closeSidePanel}
        onBackToReport={() => setTriageDecision(null)}
        onAddGapSkill={handleAddGapSkill}
        onGenerateDocuments={handleGenerateDocuments}
        onPreviewDocuments={handleOpenDocumentPreview}
      />
    )
  }
  // Save form screen
  if (view === "saveForm") {
    return (
      <SaveApplicationScreen
        editingApplication={editingApplication}
        formData={saveFormData}
        setFormData={setSaveFormData}
        saveDocuments={saveDocs}
        showSaveDocuments={Boolean(result?.resumeContent)}
        error={saveFormError}
        generatingDocuments={generatingDocsForApp}
        documentGenerationError={docsGenError}
        onSaveDocumentsChange={setSaveDocs}
        onGenerateDocuments={generateDocumentsForApplication}
        onSave={handleSaveApplication}
        onClose={() => setView("success")}
      />
    )
  }

  return (
    <MatchFormScreen
      companyName={companyName}
      jobTitle={jobTitle}
      jobDescription={jobDescription}
      routingLabels={routingLabels}
      userProfile={userProfile}
      status={status}
      onCompanyNameChange={setCompanyName}
      onJobTitleChange={setJobTitle}
      onJobDescriptionChange={setJobDescription}
      onSubmit={handleSubmit}
      onOpenSettings={() => chrome.runtime.openOptionsPage()}
      onClose={closeSidePanel}
    />
  )
}

export default IndexDialog

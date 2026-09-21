import { useRef, useState } from "react"

import { Toast } from "~components/common/Toast"
import { AnalysisSplash } from "~components/dialog/AnalysisSplash"
import { DuplicateApplicationDialog } from "~components/dialog/DuplicateApplicationDialog"
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
    duplicateApplication,
    progress,
    quoteIndex,
    quoteVisible,
    submit: handleSubmit,
    addGapSkill: handleAddGapSkill,
    dismissDuplicate: handleDismissDuplicate,
    goToDuplicateApplication: handleGoToDuplicateApplication,
    analyzeDuplicateAnyway: handleAnalyzeDuplicateAnyway
  } = useMatchAnalysis({
    initialView,
    initialPendingJobData,
    view,
    setView,
    userProfile,
    setUserProfile
  })
  const { companyInfo, companyInfoLoading, companyInfoError } =
    useCompanyResearch(companyName, Boolean(result), pendingJobUrl)
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
    savedNoticeId: docsSavedNoticeId,
    dismissSavedNotice: dismissDocsSavedNotice,
    documentsSaveError: docsSaveError,
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
    pendingJobUrl,
    userProfile,
    analysisLoading: loading,
    result,
    setResult,
    editingApplication,
    setEditingApplication,
    setSavedApplications
  })

  // Portalled, so one node covers both screens that can auto-save. Keyed on
  // the notice id so a regeneration restarts the toast rather than inheriting
  // the previous one's remaining time.
  const savedToast = docsSavedNoticeId ? (
    <Toast
      key={docsSavedNoticeId}
      message="Application automatically saved"
      onDismiss={dismissDocsSavedNotice}
    />
  ) : null

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
      <>
        <MatchReportScreen
          fullName={userProfile.personalInfo?.fullName ?? ""}
          companyName={companyName}
          jobTitle={jobTitle}
          result={result}
          triageDecision={triageDecision}
          openMatchSection={matchAccordionOpen}
          companyInfo={companyInfo}
          companyInfoLoading={companyInfoLoading}
          companyInfoError={companyInfoError}
          projectsExpanded={projectsExpanded}
          addedGapSkills={addedGapSkills}
          documentsLoading={docsLoading}
          documentsProgress={docsProgress}
          documentsError={docsError}
          documentsSaveError={docsSaveError}
          previewError={previewError}
          onToggleMatchSection={(section) =>
            setMatchAccordionOpen((current) =>
              current === section ? null : section
            )
          }
          onToggleProjects={() => setProjectsExpanded((current) => !current)}
          onApply={() => setTriageDecision("apply")}
          onSaveForLater={() => openSaveForm(editingApplication)}
          onDiscard={closeSidePanel}
          onBackToReport={() => setTriageDecision(null)}
          onAddGapSkill={handleAddGapSkill}
          onGenerateDocuments={handleGenerateDocuments}
          onPreviewDocuments={handleOpenDocumentPreview}
        />
        {savedToast}
      </>
    )
  }
  // Save form screen
  if (view === "saveForm") {
    return (
      <>
        <SaveApplicationScreen
          editingApplication={editingApplication}
          formData={saveFormData}
          setFormData={setSaveFormData}
          saveDocuments={saveDocs}
          showSaveDocuments={
            Boolean(result?.resumeContent) && !editingApplication
          }
          error={saveFormError}
          generatingDocuments={generatingDocsForApp}
          documentGenerationError={docsGenError || docsSaveError}
          onSaveDocumentsChange={setSaveDocs}
          onGenerateDocuments={generateDocumentsForApplication}
          onSave={handleSaveApplication}
          onClose={() => setView("success")}
        />
        {savedToast}
      </>
    )
  }

  return (
    <>
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
      {duplicateApplication && (
        <DuplicateApplicationDialog
          application={duplicateApplication}
          onGoToApplications={handleGoToDuplicateApplication}
          onAnalyzeAnyway={handleAnalyzeDuplicateAnyway}
          onDismiss={handleDismissDuplicate}
        />
      )}
    </>
  )
}

export default IndexDialog

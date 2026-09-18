import type { Dispatch, SetStateAction } from "react"
import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { useDocumentGenerationProgress } from "~hooks/dialog/useSimulatedProgress"
import { STORAGE_KEYS } from "~storage/keys"
import {
  mutateSavedApplications,
  saveGeneratedDocuments
} from "~storage/savedApplications"
import type { GeneratedDocuments, GenerationResult } from "~types/dialog"
import type { DocumentPreviewDraft } from "~types/documentPreview"
import type { SavedApplication, UserProfile } from "~types/userProfile"

interface UseDocumentGenerationOptions {
  companyName: string
  jobTitle: string
  jobDescription: string
  pendingJobUrl: string
  userProfile: UserProfile
  analysisLoading: boolean
  result: GenerationResult | null
  setResult: Dispatch<SetStateAction<GenerationResult | null>>
  editingApplication: SavedApplication | null
  setEditingApplication: Dispatch<SetStateAction<SavedApplication | null>>
  setSavedApplications: Dispatch<SetStateAction<SavedApplication[]>>
}

export function useDocumentGeneration({
  companyName,
  jobTitle,
  jobDescription,
  pendingJobUrl,
  userProfile,
  analysisLoading,
  result,
  setResult,
  editingApplication,
  setEditingApplication,
  setSavedApplications
}: UseDocumentGenerationOptions) {
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const { progress: documentsProgress, setProgress: setDocumentsProgress } =
    useDocumentGenerationProgress(documentsLoading)
  const [documentsError, setDocumentsError] = useState("")
  const [
    generatingDocumentsForApplication,
    setGeneratingDocumentsForApplication
  ] = useState(false)
  const [applicationDocumentsError, setApplicationDocumentsError] = useState("")
  // Bumped on every successful auto-save and used as the toast's key, so a
  // second generation re-announces instead of riding out the first toast's
  // timer. `0` means nothing to announce.
  const [savedNoticeId, setSavedNoticeId] = useState(0)
  const [documentsSaveError, setDocumentsSaveError] = useState("")
  const [previewError, setPreviewError] = useState("")

  useEffect(() => {
    if (analysisLoading) setDocumentsError("")
  }, [analysisLoading])

  // Documents are tracked the moment they exist, so the user never loses a
  // generation by closing the panel. The first successful run creates the
  // application entry; every later one updates that same entry, which is what
  // keeps a regeneration from leaving a second copy behind.
  const autoSave = async (documents: GeneratedDocuments): Promise<boolean> => {
    try {
      const { applications, application } = await saveGeneratedDocuments(
        {
          applicationId: editingApplication?.id,
          company: editingApplication?.company ?? companyName,
          jobTitle: editingApplication?.jobTitle ?? jobTitle,
          jobUrl: pendingJobUrl || undefined,
          jobDescription: jobDescription || undefined,
          matchPercentage: result?.match.percentage,
          matchSummary: result?.match.summary,
          matchStrengths: result?.match.strengths,
          matchWeaknesses: result?.match.weaknesses,
          matchImprovements: result?.match.improvements
        },
        documents
      )
      setSavedApplications(applications)
      if (application) setEditingApplication(application)
      setDocumentsSaveError("")
      return true
    } catch (error) {
      // The documents themselves survive in `result` — only the write failed,
      // so say so rather than reporting the generation as failed. This one
      // stays on screen instead of fading like the success toast.
      setDocumentsSaveError(
        error instanceof Error
          ? `Documents generated, but saving them failed: ${error.message}`
          : "Documents generated, but saving them to your applications failed."
      )
      return false
    }
  }

  const dismissSavedNotice = () => setSavedNoticeId(0)

  const generateDocuments = async () => {
    setDocumentsLoading(true)
    setDocumentsError("")

    try {
      const response = await sendToBackground({
        name: "generateDocuments",
        body: {
          companyName,
          jobTitle,
          userProfile,
          jobDescription: jobDescription || undefined
        }
      })

      if (response?.success) {
        setDocumentsProgress(100)
        const documents: GeneratedDocuments = {
          resumeContent: response.data.resumeContent,
          resumeFilename: response.data.resumeFilename,
          coverLetterContent: response.data.coverLetterContent,
          coverLetterFilename: response.data.coverLetterFilename
        }
        // Replaces the stored documents only now that new ones exist.
        const saved = await autoSave(documents)
        setTimeout(() => {
          setResult((current) =>
            current ? { ...current, ...documents } : current
          )
          setDocumentsLoading(false)
          // Announced with the documents, not while the progress bar still
          // says they're being written.
          if (saved) setSavedNoticeId((current) => current + 1)
        }, 400)
      } else {
        setDocumentsError(
          response?.message || "Generation failed. Please try again."
        )
        setDocumentsLoading(false)
      }
    } catch (error) {
      setDocumentsError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
      setDocumentsLoading(false)
    }
  }

  const generateDocumentsForApplication = async () => {
    if (!editingApplication?.jobDescription) return

    setGeneratingDocumentsForApplication(true)
    setApplicationDocumentsError("")

    try {
      const response = await sendToBackground({
        name: "generateDocuments",
        body: {
          companyName: editingApplication.company,
          jobTitle: editingApplication.jobTitle,
          userProfile,
          jobDescription: editingApplication.jobDescription
        }
      })

      if (response?.success) {
        const documents: GeneratedDocuments = {
          resumeContent: response.data.resumeContent,
          resumeFilename: response.data.resumeFilename,
          coverLetterContent: response.data.coverLetterContent,
          coverLetterFilename: response.data.coverLetterFilename
        }
        const updatedApplication: SavedApplication = {
          ...editingApplication,
          ...documents
        }
        const updatedApplications = await mutateSavedApplications((current) =>
          current.map((application) =>
            application.id === updatedApplication.id
              ? updatedApplication
              : application
          )
        )
        setSavedApplications(updatedApplications)
        setEditingApplication(updatedApplication)
        setSavedNoticeId((current) => current + 1)
        // Keep the match report in step with what's now on the application.
        setResult((current) =>
          current ? { ...current, ...documents } : current
        )
      } else {
        setApplicationDocumentsError(
          response?.message || "Generation failed. Please try again."
        )
      }
    } catch (error) {
      setApplicationDocumentsError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
    } finally {
      setGeneratingDocumentsForApplication(false)
    }
  }

  const openDocumentPreview = async (
    tab: "resume" | "coverLetter",
    documents: GeneratedDocuments
  ) => {
    setPreviewError("")

    try {
      const draft: DocumentPreviewDraft = { ...documents, activeTab: tab }
      await chrome.storage.local.set({
        [STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT]: draft
      })
      const response = await sendToBackground({ name: "openDocumentPreview" })
      if (!response?.success) {
        setPreviewError(
          response?.message || "Could not open the preview window."
        )
      }
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Could not open the preview window."
      )
    }
  }

  return {
    documentsLoading,
    documentsProgress,
    documentsError,
    savedNoticeId,
    dismissSavedNotice,
    documentsSaveError,
    generatingDocumentsForApplication,
    applicationDocumentsError,
    previewError,
    generateDocuments,
    generateDocumentsForApplication,
    openDocumentPreview
  }
}

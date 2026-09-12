import type { Dispatch, SetStateAction } from "react"
import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { useDocumentGenerationProgress } from "~hooks/dialog/useSimulatedProgress"
import { STORAGE_KEYS } from "~storage/keys"
import { mutateSavedApplications } from "~storage/savedApplications"
import type { GeneratedDocuments, GenerationResult } from "~types/dialog"
import type { DocumentPreviewDraft } from "~types/documentPreview"
import type { SavedApplication, UserProfile } from "~types/userProfile"

interface UseDocumentGenerationOptions {
  companyName: string
  jobTitle: string
  jobDescription: string
  userProfile: UserProfile
  analysisLoading: boolean
  setResult: Dispatch<SetStateAction<GenerationResult | null>>
  editingApplication: SavedApplication | null
  setEditingApplication: Dispatch<SetStateAction<SavedApplication | null>>
  setSavedApplications: Dispatch<SetStateAction<SavedApplication[]>>
}

export function useDocumentGeneration({
  companyName,
  jobTitle,
  jobDescription,
  userProfile,
  analysisLoading,
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
  const [previewError, setPreviewError] = useState("")

  useEffect(() => {
    if (analysisLoading) setDocumentsError("")
  }, [analysisLoading])

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
        setTimeout(() => {
          setResult((current) =>
            current ? { ...current, ...response.data } : current
          )
          setDocumentsLoading(false)
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
        const updatedApplication: SavedApplication = {
          ...editingApplication,
          ...response.data
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
    generatingDocumentsForApplication,
    applicationDocumentsError,
    previewError,
    generateDocuments,
    generateDocumentsForApplication,
    openDocumentPreview
  }
}

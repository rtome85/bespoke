import { useState } from "react"

import { openApplicationsList } from "~lib/dialog/navigation"
import {
  mutateSavedApplications,
  setApplicationStatus
} from "~storage/savedApplications"
import type {
  DialogView,
  GenerationResult,
  SaveApplicationFormData
} from "~types/dialog"
import type { ApplicationStatus, SavedApplication } from "~types/userProfile"

interface UseApplicationFormOptions {
  companyName: string
  jobTitle: string
  jobDescription: string
  pendingJobUrl: string
  result: GenerationResult | null
  setView: (view: DialogView) => void
  setSavedApplications: (applications: SavedApplication[]) => void
}

function emptyFormData(): SaveApplicationFormData {
  return {
    company: "",
    jobTitle: "",
    status: "Saved",
    date: new Date().toISOString().split("T")[0],
    jobUrl: "",
    tags: [],
    notes: ""
  }
}

export function useApplicationForm({
  companyName,
  jobTitle,
  jobDescription,
  pendingJobUrl,
  result,
  setView,
  setSavedApplications
}: UseApplicationFormOptions) {
  const [editingApplication, setEditingApplication] =
    useState<SavedApplication | null>(null)
  const [formData, setFormData] =
    useState<SaveApplicationFormData>(emptyFormData)
  const [saveDocuments, setSaveDocuments] = useState(true)
  const [error, setError] = useState("")

  const openForm = (
    application: SavedApplication | null = null,
    defaultStatus: ApplicationStatus = "Saved"
  ) => {
    setEditingApplication(application)

    if (!application) setSaveDocuments(true)

    setFormData(
      application
        ? {
            company: application.company,
            jobTitle: application.jobTitle,
            status: application.status,
            date: application.date,
            jobUrl: application.jobUrl ?? "",
            tags: application.tags ?? [],
            notes: application.notes ?? ""
          }
        : {
            company: companyName,
            jobTitle,
            status: defaultStatus,
            date: new Date().toISOString().split("T")[0],
            jobUrl: pendingJobUrl,
            tags: [],
            notes: ""
          }
    )
    setView("saveForm")
  }

  const saveApplication = () => {
    if (
      !formData.company.trim() ||
      !formData.jobTitle.trim() ||
      !formData.date
    ) {
      setError("Company, job title, and date are required.")
      return
    }
    setError("")

    const documents =
      !editingApplication && result?.resumeContent && saveDocuments
        ? {
            resumeContent: result.resumeContent,
            resumeFilename: result.resumeFilename,
            coverLetterContent: result.coverLetterContent,
            coverLetterFilename: result.coverLetterFilename
          }
        : {}

    const matchData =
      !editingApplication && result
        ? {
            matchPercentage: result.match.percentage,
            jobDescription: jobDescription || undefined,
            matchSummary: result.match.summary,
            matchStrengths: result.match.strengths,
            matchWeaknesses: result.match.weaknesses,
            matchImprovements: result.match.improvements
          }
        : {}

    const editedApplicationId = editingApplication?.id
    const statusChanged =
      !!editingApplication && editingApplication.status !== formData.status
    const now = new Date().toISOString()

    void mutateSavedApplications((current) =>
      editingApplication
        ? current.map((application) =>
            application.id === editingApplication.id
              ? {
                  ...application,
                  ...formData,
                  jobUrl: formData.jobUrl || undefined,
                  statusUpdatedAt:
                    formData.status !== application.status
                      ? now
                      : application.statusUpdatedAt ?? application.createdAt
                }
              : application
          )
        : [
            ...current,
            {
              ...formData,
              jobUrl: formData.jobUrl || undefined,
              ...documents,
              ...matchData,
              id: crypto.randomUUID(),
              createdAt: now,
              statusUpdatedAt: now
            }
          ]
    ).then(async (applications) => {
      if (statusChanged && editedApplicationId) {
        await setApplicationStatus(editedApplicationId, formData.status)
        const stored = await chrome.storage.local.get("savedApplications")
        setSavedApplications(
          Array.isArray(stored.savedApplications)
            ? stored.savedApplications
            : applications
        )
      } else {
        setSavedApplications(applications)
      }
    })

    openApplicationsList()
    setView("success")
  }

  return {
    editingApplication,
    setEditingApplication,
    formData,
    setFormData,
    saveDocuments,
    setSaveDocuments,
    error,
    openForm,
    saveApplication
  }
}

import type { Dispatch, FormEvent, SetStateAction } from "react"
import { useEffect, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { QUOTES } from "~constants/dialog"
import { useDocumentPreviewSync } from "~hooks/dialog/useDocumentPreviewSync"
import { usePendingJobData } from "~hooks/dialog/usePendingJobData"
import { useAnalysisSplashState } from "~hooks/dialog/useSimulatedProgress"
import type {
  AddedGapSkills,
  DialogView,
  GenerationResult,
  PendingJobData,
  TriageDecision
} from "~types/dialog"
import type { UserProfile } from "~types/userProfile"

interface UseMatchAnalysisOptions {
  initialView: DialogView | null
  initialPendingJobData: PendingJobData | null
  view: DialogView
  setView: Dispatch<SetStateAction<DialogView>>
  userProfile: UserProfile
  setUserProfile: Dispatch<SetStateAction<UserProfile>>
}

export function useMatchAnalysis({
  initialView,
  initialPendingJobData,
  view,
  setView,
  userProfile,
  setUserProfile
}: UseMatchAnalysisOptions) {
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [pendingJobUrl, setPendingJobUrl] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [autoAnalyze, setAutoAnalyze] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [triageDecision, setTriageDecision] = useState<TriageDecision | null>(
    null
  )
  const [addedGapSkills, setAddedGapSkills] = useState<AddedGapSkills>({})
  const analysisRequestIdRef = useRef(0)
  const { progress, setProgress, quoteIndex, quoteVisible } =
    useAnalysisSplashState(view, loading, QUOTES.length)

  useDocumentPreviewSync(setResult)

  usePendingJobData((data) => {
    if (!data) return

    if (data.extracting) {
      analysisRequestIdRef.current++
      setView("extracting")
      setProgress(0)
      return
    }
    if (data.error) {
      setStatus("Unable to extract the details. Please fill in manually.")
      setView("form")
      return
    }

    const extractedCompany = data.companyName || ""
    const extractedTitle = data.jobTitle || ""
    const extractedDescription = data.selectedText || ""
    if (data.tabUrl) setPendingJobUrl(data.tabUrl)
    setCompanyName(extractedCompany)
    setJobTitle(extractedTitle)
    setJobDescription(extractedDescription)

    if (extractedCompany.trim() && extractedTitle.trim()) {
      setAutoAnalyze(true)
    } else {
      setStatus("Unable to extract the details. Please fill in manually.")
      setView("form")
    }
  })

  useEffect(() => {
    const data = initialPendingJobData
    if (!data) return

    if (data.extracting) {
      analysisRequestIdRef.current++
      setView("extracting")
      setProgress(0)
      return
    }

    const extractedCompany = data.companyName || ""
    const extractedTitle = data.jobTitle || ""
    if (extractedCompany) setCompanyName(extractedCompany)
    if (extractedTitle) setJobTitle(extractedTitle)
    if (data.tabUrl) setPendingJobUrl(data.tabUrl)
    if (data.selectedText) setJobDescription(data.selectedText)

    if (!initialView && extractedCompany.trim() && extractedTitle.trim()) {
      setAutoAnalyze(true)
    }
  }, [initialPendingJobData, initialView, setProgress, setView])

  useEffect(() => {
    if (loading) setView("loading")
  }, [loading, setView])

  const runAnalysis = async (
    company: string,
    title: string,
    description: string
  ) => {
    const requestId = ++analysisRequestIdRef.current

    setLoading(true)
    setStatus("")
    setTriageDecision(null)
    setAddedGapSkills({})

    try {
      const response = await sendToBackground({
        name: "analyzeMatch",
        body: {
          companyName: company,
          jobTitle: title,
          userProfile,
          jobDescription: description || undefined
        }
      })

      if (analysisRequestIdRef.current !== requestId) return

      if (response?.success) {
        setProgress(100)
        setTimeout(() => {
          if (analysisRequestIdRef.current !== requestId) return
          setLoading(false)
          setResult(response.data)
          setView("success")
        }, 400)
      } else {
        setLoading(false)
        setView("form")
        setStatus(
          response?.message || "Match analysis failed. Please try again."
        )
      }
    } catch (error) {
      if (analysisRequestIdRef.current !== requestId) return
      setLoading(false)
      setView("form")
      setStatus(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (!companyName.trim() || !jobTitle.trim()) {
      setStatus("Please fill in company name and job title")
      return
    }

    await runAnalysis(companyName, jobTitle, jobDescription)
  }

  useEffect(() => {
    if (!autoAnalyze) return
    setAutoAnalyze(false)
    void runAnalysis(companyName, jobTitle, jobDescription)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze])

  const addGapSkill = (index: number, name: string, years: number) => {
    setAddedGapSkills((current) => ({
      ...current,
      [index]: { name, years }
    }))
    setUserProfile((current) => {
      if (
        current.skills.some(
          (skill) => skill.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        return current
      }
      const updated = {
        ...current,
        skills: [
          ...current.skills,
          { id: crypto.randomUUID(), name, yearsOfExperience: years }
        ]
      }
      chrome.storage.local.set({ userProfile: updated })
      return updated
    })
  }

  return {
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
    submit,
    addGapSkill
  }
}

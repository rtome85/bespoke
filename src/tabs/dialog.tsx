import {
  Briefcase,
  Building2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Lightbulb,
  Mail,
  Pencil,
  Sparkles,
  Trash2,
  Users,
  X
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import type { CompanyInfo } from "~api/perplexityClient"
import { PreparationPlanModal } from "~components/PreparationPlanModal"
import { downloadMarkdownAsPdf } from "~lib/pdf"
import { AVAILABLE_MODELS } from "~types/config"
import type { PerplexityConfig } from "~types/config"
import {
  APPLICATION_STATUSES,
  DEFAULT_USER_PROFILE,
  type ApplicationStatus,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"
import { downloadMarkdownFile } from "~utils/documentFormatter"

import "../style.css"

const PRESET_TAGS = [
  "Dream company",
  "Remote only",
  "Urgente",
  "Referral",
  "Top priority"
]

const QUOTES = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain"
  },
  {
    text: "It always seems impossible until it's done.",
    author: "Nelson Mandela"
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt"
  },
  {
    text: "In the middle of every difficulty lies opportunity.",
    author: "Albert Einstein"
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    text: "Luck is what happens when preparation meets opportunity.",
    author: "Seneca"
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius"
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt"
  },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin"
  },
  {
    text: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs"
  }
]

interface GenerationResult {
  resumeContent: string
  resumeFilename: string
  coverLetterContent: string
  coverLetterFilename: string
  match: {
    percentage: number
    summary: string
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
  }
}

type View = "form" | "loading" | "success" | "saveForm" | "applicationsList"

function statusBadgeClass(status: ApplicationStatus): string {
  switch (status) {
    case "Saved":
      return "bg-gray-100 text-gray-800"
    case "Offer":
      return "bg-green-100 text-green-800"
    case "Reject":
      return "bg-red-100 text-red-800"
    case "Applied":
      return "bg-blue-100 text-blue-800"
    default:
      return "bg-yellow-100 text-yellow-800"
  }
}

function IndexDialog() {
  const initialView = new URLSearchParams(window.location.search).get(
    "view"
  ) as View | null
  const [view, setView] = useState<View>(initialView ?? "form")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [selectedModel, setSelectedModel] = useState("gpt-oss:20b-cloud")
  const [userProfile, setUserProfile] =
    useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * QUOTES.length)
  )
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false)
  const [projectsExpanded, setProjectsExpanded] = useState(false)
  const [perplexityConfig, setPerplexityConfig] =
    useState<PerplexityConfig | null>(null)

  // Application tracker state
  const [savedApplications, setSavedApplications] = useState<
    SavedApplication[]
  >([])
  const [editingApplication, setEditingApplication] =
    useState<SavedApplication | null>(null)
  const [viewingApplication, setViewingApplication] =
    useState<SavedApplication | null>(null)
  const [pendingJobUrl, setPendingJobUrl] = useState("")
  const [saveFormData, setSaveFormData] = useState({
    company: "",
    jobTitle: "",
    status: "Saved" as ApplicationStatus,
    date: new Date().toISOString().split("T")[0],
    jobUrl: "",
    tags: [] as string[],
    notes: "",
    isFavorite: false
  })
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  // Track where the save form was opened from so Cancel goes back correctly
  const [saveFormOrigin, setSaveFormOrigin] = useState<
    "success" | "applicationsList"
  >("success")
  const [saveDocs, setSaveDocs] = useState(true)
  const [saveFormError, setSaveFormError] = useState("")

  // Preparation plan state
  const [preparationPlanModalOpen, setPreparationPlanModalOpen] =
    useState(false)
  const [preparationPlanContent, setPreparationPlanContent] = useState("")
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planError, setPlanError] = useState("")

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    chrome.storage.local.get(
      [
        "lastSelectedModel",
        "userProfile",
        "pendingJobData",
        "savedApplications",
        "perplexityConfig"
      ],
      (res) => {
        if (res.lastSelectedModel) setSelectedModel(res.lastSelectedModel)
        if (res.userProfile) setUserProfile(res.userProfile)
        if (res.pendingJobData?.companyName)
          setCompanyName(res.pendingJobData.companyName)
        if (res.pendingJobData?.jobTitle)
          setJobTitle(res.pendingJobData.jobTitle)
        if (res.pendingJobData?.tabUrl)
          setPendingJobUrl(res.pendingJobData.tabUrl)
        if (res.savedApplications) setSavedApplications(res.savedApplications)
        if (res.perplexityConfig) setPerplexityConfig(res.perplexityConfig)
      }
    )
  }, [])

  useEffect(() => {
    if (loading) {
      setView("loading")
      setProgress(0)

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev
          const increment = Math.max(0.3, (85 - prev) * 0.04)
          return Math.min(85, prev + increment)
        })
      }, 300)

      quoteIntervalRef.current = setInterval(() => {
        setQuoteVisible(false)
        setTimeout(() => {
          setQuoteIndex((i) => (i + 1) % QUOTES.length)
          setQuoteVisible(true)
        }, 400)
      }, 8000)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current)
        quoteIntervalRef.current = null
      }
    }

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current)
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current)
    }
  }, [loading])

  useEffect(() => {
    if (
      !result ||
      !companyName ||
      !perplexityConfig?.enabled ||
      !perplexityConfig?.apiKey
    ) {
      setCompanyInfo(null)
      setCompanyInfoLoading(false)
      return
    }

    const fetchCompanyInfo = async () => {
      setCompanyInfoLoading(true)
      setCompanyInfo(null)
      try {
        const response = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${perplexityConfig.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a company research assistant. Always respond with valid JSON only, no markdown formatting."
                },
                {
                  role: "user",
                  content: perplexityConfig.customPrompt.replace(
                    /\{\{companyName\}\}/g,
                    companyName
                  )
                }
              ],
              max_tokens: 800,
              temperature: 0.2
            })
          }
        )

        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.["message"]?.["content"] || ""

          // Strip markdown fences if present
          const jsonStr = content
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/, "")
            .trim()

          let raw: Record<string, unknown> = {}
          try {
            raw = JSON.parse(jsonStr)
          } catch {
            console.error("Failed to parse Perplexity JSON response", content)
          }

          // Case-insensitive fuzzy field lookup
          const getField = (
            obj: Record<string, unknown>,
            ...keys: string[]
          ): unknown => {
            for (const key of keys) {
              if (obj[key] !== undefined) return obj[key]
              const found = Object.keys(obj).find(
                (k) => k.toLowerCase() === key.toLowerCase()
              )
              if (found !== undefined) return obj[found]
            }
            // Partial-match fallback
            for (const key of keys) {
              const found = Object.keys(obj).find((k) =>
                k.toLowerCase().includes(key.toLowerCase())
              )
              if (found !== undefined) return obj[found]
            }
            return undefined
          }

          const cleanStr = (v: unknown): string =>
            typeof v === "string"
              ? v.replace(/\[\d+\]/g, "").trim()
              : "Not available"

          const cleanRating = (v: unknown): number | undefined => {
            const n = typeof v === "number" ? v : parseFloat(v as string)
            return !isNaN(n) && n >= 0 && n <= 5 ? n : undefined
          }

          // Parse notableProjects — may be an array OR a bullet-point string
          const parseProjects = (v: unknown): string[] => {
            if (Array.isArray(v)) {
              return v
                .map((p) => cleanStr(p))
                .filter((p) => p.length > 3)
                .slice(0, 6)
            }
            if (typeof v === "string") {
              return v
                .split("\n")
                .map((l) =>
                  l
                    .replace(/^[-•*]\s+/, "")
                    .replace(/\[\d+\]/g, "")
                    .trim()
                )
                .filter((l) => l.length > 3)
                .slice(0, 6)
            }
            return []
          }

          const ratingsObj =
            (getField(raw, "ratings") as Record<string, unknown> | undefined) ??
            {}

          setCompanyInfo({
            industry: cleanStr(
              getField(
                raw,
                "industry",
                "Industry/Sector",
                "sector",
                "industry_sector"
              )
            ),
            size: cleanStr(
              getField(
                raw,
                "size",
                "Company size (employees)",
                "employees",
                "company_size_employees",
                "headcount"
              )
            ),
            description: cleanStr(
              getField(
                raw,
                "description",
                "Brief description",
                "brief_description",
                "about",
                "overview",
                "summary"
              )
            ),
            notableProjects: parseProjects(
              getField(
                raw,
                "notableProjects",
                "Notable projects, products, or services",
                "notable_projects_products_services",
                "projects",
                "products",
                "services"
              )
            ),
            ratings: {
              glassdoor: cleanRating(
                ratingsObj.glassdoor ??
                getField(
                  raw,
                  "glassdoor",
                  "Glassdoor Rating",
                  "glassdoor_rating"
                )
              ),
              indeed: cleanRating(
                ratingsObj.indeed ??
                getField(raw, "indeed", "Indeed Rating", "indeed_rating")
              ),
              teamlyzer: cleanRating(
                ratingsObj.teamlyzer ??
                getField(
                  raw,
                  "teamlyzer",
                  "Teamlyzer Rating",
                  "Overall Teamlyzer Rating"
                )
              )
            },
            sources: []
          })
        } else {
          setCompanyInfo(null)
        }
      } catch (error) {
        setCompanyInfo(null)
        console.error("Failed to fetch company info:", error)
      } finally {
        setCompanyInfoLoading(false)
      }
    }

    fetchCompanyInfo()
  }, [result, companyName, perplexityConfig])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim() || !jobTitle.trim()) {
      setStatus("Please fill in company name and job title")
      return
    }

    setLoading(true)
    setStatus("")

    chrome.storage.local.set({ lastSelectedModel: selectedModel })

    try {
      const response = await sendToBackground({
        name: "generateDocuments",
        body: { companyName, jobTitle, model: selectedModel, userProfile }
      })

      if (response?.success) {
        setProgress(100)
        setTimeout(() => {
          setLoading(false)
          setResult(response.data)
          setView("success")
        }, 400)
      } else {
        setLoading(false)
        setView("form")
        setStatus(response?.message || "Generation failed. Please try again.")
      }
    } catch (error) {
      setLoading(false)
      setView("form")
      setStatus(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
    }
  }

  const openSaveForm = (
    origin: "success" | "applicationsList",
    app: SavedApplication | null = null
  ) => {
    setEditingApplication(app)
    setSaveFormOrigin(origin)

    if (!app && origin === "success") {
      setSaveDocs(true)
    }

    if (app) {
      setSaveFormData({
        company: app.company,
        jobTitle: app.jobTitle,
        status: app.status,
        date: app.date,
        jobUrl: app.jobUrl ?? "",
        tags: app.tags ?? [],
        notes: app.notes ?? "",
        isFavorite: app.isFavorite ?? false
      })
    } else {
      setSaveFormData({
        company: companyName,
        jobTitle: jobTitle,
        status: "Saved",
        date: new Date().toISOString().split("T")[0],
        jobUrl: pendingJobUrl,
        tags: [],
        notes: "",
        isFavorite: false
      })
    }
    setView("saveForm")
  }

  const handleSaveApplication = () => {
    if (
      !saveFormData.company.trim() ||
      !saveFormData.jobTitle.trim() ||
      !saveFormData.date
    ) {
      setSaveFormError("Company, job title, and date are required.")
      return
    }
    setSaveFormError("")

    const docs =
      !editingApplication && result && saveDocs
        ? {
          resumeContent: result.resumeContent,
          resumeFilename: result.resumeFilename,
          coverLetterContent: result.coverLetterContent,
          coverLetterFilename: result.coverLetterFilename
        }
        : {}

    const matchData =
      !editingApplication && result
        ? { matchPercentage: result.match.percentage }
        : {}

    const updated: SavedApplication[] = editingApplication
      ? savedApplications.map((a) =>
        a.id === editingApplication.id
          ? {
            ...a,
            ...saveFormData,
            jobUrl: saveFormData.jobUrl || undefined,
            // Preserve existing preparation plan
            preparationPlan: a.preparationPlan
          }
          : a
      )
      : [
        ...savedApplications,
        {
          ...saveFormData,
          jobUrl: saveFormData.jobUrl || undefined,
          ...docs,
          ...matchData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        }
      ]
    chrome.storage.local.set({ savedApplications: updated })
    setSavedApplications(updated)
    setView("applicationsList")
  }

  const handleDeleteApplication = (id: string) => {
    const updated = savedApplications.filter((a) => a.id !== id)
    chrome.storage.local.set({ savedApplications: updated })
    setSavedApplications(updated)
    setDeleteConfirmId(null)
  }

  // Check if current status is an interview stage that needs preparation plan
  const isInterviewStage = (status: ApplicationStatus): boolean => {
    return [
      "HR Interview",
      "1st Technical Interview",
      "2nd Technical Interview"
    ].includes(status)
  }

  // Generate preparation plan using Perplexity
  const generatePreparationPlan = async (app?: SavedApplication) => {
    if (!perplexityConfig?.enabled || !perplexityConfig?.apiKey) {
      setPlanError(
        "Perplexity API not configured. Please configure it in the extension options."
      )
      return
    }

    setGeneratingPlan(true)
    setPlanError("")
    setPreparationPlanContent("")

    try {
      const { PerplexityClient } = await import("~api/perplexityClient")
      const client = new PerplexityClient(perplexityConfig)

      // Use provided application or fall back to editingApplication/saveFormData
      const targetApp = app || editingApplication
      const company = targetApp?.company || saveFormData.company
      const jobTitle = targetApp?.jobTitle || saveFormData.jobTitle
      const status = targetApp?.status || saveFormData.status

      // Get job description from current context or use placeholder
      const jobDescription =
        result?.match?.summary || "Job description not available"

      const planContent = await client.generateInterviewPrepPlan(
        company,
        jobTitle,
        jobDescription,
        status
      )

      setPreparationPlanContent(planContent)
      setPreparationPlanModalOpen(true)
    } catch (error) {
      console.error("Failed to generate preparation plan:", error)
      setPlanError("Error generating preparation plan. Please try again.")
    } finally {
      setGeneratingPlan(false)
    }
  }

  // Save the generated preparation plan to the application
  const savePreparationPlan = () => {
    if (!editingApplication || !preparationPlanContent) return

    const updated: SavedApplication[] = savedApplications.map((a) =>
      a.id === editingApplication.id
        ? {
          ...a,
          preparationPlan: {
            content: preparationPlanContent,
            generatedAt: new Date().toISOString(),
            interviewType: saveFormData.status as
              | "HR Interview"
              | "1st Technical Interview"
              | "2nd Technical Interview"
          }
        }
        : a
    )

    chrome.storage.local.set({ savedApplications: updated })
    setSavedApplications(updated)
    setEditingApplication(
      updated.find((a) => a.id === editingApplication.id) || null
    )
    setPreparationPlanModalOpen(false)
  }

  const matchColor = (pct: number) => {
    if (pct >= 70) return "bg-green-500"
    if (pct >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Loading screen
  if (view === "loading") {
    const quote = QUOTES[quoteIndex]
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-100 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="text-4xl mb-4">✨</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Crafting your documents…
          </h2>
          <p className="text-sm text-gray-500 mb-6">This may take a minute</p>

          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-8 overflow-hidden">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="transition-opacity duration-400"
            style={{ opacity: quoteVisible ? 1 : 0 }}>
            <p className="text-gray-600 italic text-sm leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-gray-400 text-xs mt-2">— {quote.author}</p>
          </div>
        </div>
      </div>
    )
  }

  // Success screen
  if (view === "success" && result) {
    const pct = result.match.percentage
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-100 p-4">
        <div className="w-full max-w-2xl p-8 bg-white rounded-2xl shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">
              Documents Ready!
            </h2>
          </div>

          {/* Match score card */}
          <div className="bg-gray-50 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Match Score
              </span>
              <span
                className={`text-2xl font-bold ${pct >= 70
                  ? "text-green-600"
                  : pct >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
                  }`}>
                {pct}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${matchColor(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {result.match.summary && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {result.match.summary}
              </p>
            )}
          </div>

          {/* Strengths / Weaknesses / Improvements */}
          {((result.match.strengths?.length ?? 0) > 0 ||
            (result.match.weaknesses?.length ?? 0) > 0) && (
              <div className=" mb-5 flex flex-row gap-2">
                {(result.match.strengths?.length ?? 0) > 0 && (
                  <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {result.match.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs text-green-800">
                          <span className="mt-0.5 shrink-0">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(result.match.weaknesses?.length ?? 0) > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                      Weaknesses
                    </p>
                    <ul className="space-y-1">
                      {result.match.weaknesses.map((w, i) => (
                        <li key={i} className="flex gap-2 text-xs text-red-800">
                          <span className="mt-0.5 shrink-0">✗</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          {(result.match.improvements?.length ?? 0) > 0 && (
            <div className="mb-5">
              {(result.match.improvements?.length ?? 0) > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                    Improvements
                  </p>
                  <ul className="space-y-1">
                    {result.match.improvements.map((imp, i) => (
                      <li key={i} className="flex gap-2 text-xs text-blue-800">
                        <span className="mt-0.5 shrink-0">→</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Company About Section */}
          {(companyInfo || companyInfoLoading) && (
            <div className="mb-5">
              {companyInfoLoading ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Researching {companyName}...
                    </span>
                  </div>
                </div>
              ) : (
                companyInfo && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-semibold text-indigo-700">
                        About {companyName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600">
                          {companyInfo.industry}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600">
                          {companyInfo.size}
                        </span>
                      </div>
                    </div>

                    {companyInfo.description && (
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        {companyInfo.description}
                      </p>
                    )}

                    {companyInfo.notableProjects.length > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() => setProjectsExpanded((v) => !v)}
                          className="flex items-center gap-1.5 w-full text-left text-xs font-semibold text-indigo-700 mb-1">
                          <span
                            className="transition-transform duration-200"
                            style={{
                              display: "inline-block",
                              transform: projectsExpanded
                                ? "rotate(90deg)"
                                : "rotate(0deg)"
                            }}>
                            ▶
                          </span>
                          Notable projects / products (
                          {companyInfo.notableProjects.length})
                        </button>
                        {projectsExpanded && (
                          <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1 mt-1.5">
                            {companyInfo.notableProjects.map((project, idx) => (
                              <li key={`${project}-${idx}`}>{project}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {(companyInfo.ratings.glassdoor ||
                      companyInfo.ratings.indeed ||
                      companyInfo.ratings.teamlyzer) && (
                        <div className="flex flex-wrap gap-2">
                          {companyInfo.ratings.glassdoor && (
                            <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-xs font-medium">
                              <span className="text-gray-500">Glassdoor</span>
                              <span
                                className={
                                  companyInfo.ratings.glassdoor >= 3.5
                                    ? "text-green-600"
                                    : "text-red-600"
                                }>
                                {companyInfo.ratings.glassdoor}★
                              </span>
                            </span>
                          )}
                          {companyInfo.ratings.indeed && (
                            <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-xs font-medium">
                              <span className="text-gray-500">Indeed</span>
                              <span
                                className={
                                  companyInfo.ratings.indeed >= 3.5
                                    ? "text-green-600"
                                    : "text-red-600"
                                }>
                                {companyInfo.ratings.indeed}★
                              </span>
                            </span>
                          )}
                          {companyInfo.ratings.teamlyzer && (
                            <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-xs font-medium">
                              <span className="text-gray-500">Teamlyzer</span>
                              <span
                                className={
                                  companyInfo.ratings.teamlyzer >= 3.5
                                    ? "text-green-600"
                                    : "text-red-600"
                                }>
                                {companyInfo.ratings.teamlyzer}★
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Download buttons */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-3">
            {/* Resume Download */}
            <div className="flex flex-row gap-2 items-center justify-between">
              <p className="text-lg font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Download Resume
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadMarkdownFile(
                      result.resumeFilename,
                      result.resumeContent
                    )
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                             bg-white border border-slate-200 text-slate-500 rounded-lg
                             hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700
                             active:scale-[0.97] transition-all text-xs font-medium
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
                  <FileText size={13} />
                  <span>MD</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadMarkdownAsPdf(
                        result.resumeContent,
                        result.resumeFilename
                      )
                    } catch (error) {
                      console.error("PDF export failed:", error)
                      alert("Failed to generate PDF. Please try again.")
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                             bg-violet-600 text-white rounded-lg shadow-sm
                             hover:bg-violet-700 active:scale-[0.97]
                             transition-all text-xs font-medium
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Cover Letter Download */}
            <div className="flex flex-row gap-2 items-center justify-between">
              <p className="text-lg font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Download Cover Letter
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadMarkdownFile(
                      result.coverLetterFilename,
                      result.coverLetterContent
                    )
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                             bg-white border border-slate-200 text-slate-500 rounded-lg
                             hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700
                             active:scale-[0.97] transition-all text-xs font-medium
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
                  <FileText size={13} />
                  <span>MD</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadMarkdownAsPdf(
                        result.coverLetterContent,
                        result.coverLetterFilename
                      )
                    } catch (error) {
                      console.error("PDF export failed:", error)
                      alert("Failed to generate PDF. Please try again.")
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                             bg-indigo-600 text-white rounded-lg shadow-sm
                             hover:bg-indigo-700 active:scale-[0.97]
                             transition-all text-xs font-medium
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
                  <Download size={13} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center justify-between">
            <button
              onClick={() => openSaveForm("success")}
              className="w-full mt-3 px-4 py-3 text-sm font-medium
                       bg-gradient-to-r from-emerald-500 to-emerald-600
                       text-white rounded-lg hover:opacity-90 transition-opacity">
              Save Application
            </button>

            <button
              onClick={() => setView("applicationsList")}
              className="w-full mt-2 px-4 py-2 text-sm text-gray-500
                       border border-gray-200 rounded-lg hover:bg-gray-50
                       transition-colors">
              View Saved Applications
            </button>
          </div>

          <button
            onClick={() => window.close()}
            className="w-full mt-2 px-4 py-2 text-sm text-gray-400
                       hover:text-gray-600 transition-colors">
            Close
          </button>
        </div>
      </div>
    )
  }

  // Save form screen
  if (view === "saveForm") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-100 p-4">
        <PreparationPlanModal
          isOpen={preparationPlanModalOpen}
          onClose={() => setPreparationPlanModalOpen(false)}
          content={preparationPlanContent}
          companyName={saveFormData.company}
          interviewType={saveFormData.status}
          onSave={editingApplication ? savePreparationPlan : undefined}
        />

        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingApplication ? "Edit Application" : "Save Application"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Track your job application
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={saveFormData.company}
                onChange={(e) =>
                  setSaveFormData((d) => ({ ...d, company: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={saveFormData.jobTitle}
                onChange={(e) =>
                  setSaveFormData((d) => ({ ...d, jobTitle: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={saveFormData.status}
                onChange={(e) =>
                  setSaveFormData((d) => ({
                    ...d,
                    status: e.target.value as ApplicationStatus
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white">
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Applied
              </label>
              <input
                type="date"
                value={saveFormData.date}
                onChange={(e) =>
                  setSaveFormData((d) => ({ ...d, date: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Posting URL
              </label>
              <input
                type="url"
                value={saveFormData.jobUrl}
                onChange={(e) =>
                  setSaveFormData((d) => ({ ...d, jobUrl: e.target.value }))
                }
                placeholder="https://..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Favourite toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveFormData.isFavorite}
                onChange={(e) =>
                  setSaveFormData((f) => ({ ...f, isFavorite: e.target.checked }))
                }
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">⭐ Mark as favourite</span>
            </label>
          </div>

          {/* Tags selector */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_TAGS.map((tag) => {
                const active = saveFormData.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSaveFormData((f) => ({
                        ...f,
                        tags: active
                          ? f.tags.filter((t) => t !== tag)
                          : [...f.tags, tag]
                      }))
                    }
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? "bg-purple-100 border-purple-400 text-purple-800"
                        : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {tag}
                  </button>
                )
              })}
            </div>
            {/* Custom tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {saveFormData.tags
                .filter((t) => !PRESET_TAGS.includes(t))
                .map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                    {t}
                    <button
                      type="button"
                      onClick={() =>
                        setSaveFormData((f) => ({
                          ...f,
                          tags: f.tags.filter((x) => x !== t)
                        }))
                      }
                      className="ml-0.5 hover:text-purple-600">
                      ×
                    </button>
                  </span>
                ))}
            </div>
            <input
              type="text"
              placeholder="Add custom tag, press Enter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val && !saveFormData.tags.includes(val)) {
                    setSaveFormData((f) => ({ ...f, tags: [...f.tags, val] }))
                  }
                  ;(e.target as HTMLInputElement).value = ""
                }
              }}
            />
          </div>

          {/* Notes textarea */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={saveFormData.notes}
              onChange={(e) =>
                setSaveFormData((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Interview notes, contacts, reminders…"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {saveFormOrigin === "success" && result && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={saveDocs}
                onChange={(e) => setSaveDocs(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Save resume and cover letter
            </label>
          )}

          {saveFormError && (
            <p className="mt-4 text-sm text-red-600">{saveFormError}</p>
          )}

          {/* Preparation Plan Button - Show for interview stages */}
          {isInterviewStage(saveFormData.status) &&
            editingApplication &&
            perplexityConfig?.preparationPlanEnabled && (
              <div className="mt-6">
                {editingApplication.preparationPlan &&
                  editingApplication.preparationPlan.interviewType ===
                  saveFormData.status ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Lightbulb size={18} className="text-green-600" />
                    <span className="text-sm text-green-800 flex-1">
                      Preparation plan already generated
                    </span>
                    <button
                      onClick={() => {
                        setPreparationPlanContent(
                          editingApplication.preparationPlan!.content
                        )
                        setPreparationPlanModalOpen(true)
                      }}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                      View plan
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => generatePreparationPlan()}
                    disabled={generatingPlan}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3
                             bg-gradient-to-r from-amber-500 to-orange-500
                             text-white rounded-lg hover:opacity-90 transition-opacity font-medium
                             disabled:opacity-50 disabled:cursor-not-allowed">
                    {generatingPlan ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating plan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Generate Preparation Plan</span>
                      </>
                    )}
                  </button>
                )}
                {planError && (
                  <p className="mt-2 text-sm text-red-600">{planError}</p>
                )}
              </div>
            )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveApplication}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600
                         text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
              Save
            </button>
            <button
              onClick={() => setView(saveFormOrigin)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg
                         text-gray-700 hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Applications list screen
  if (view === "applicationsList") {
    const allTags = [
      ...new Set(savedApplications.flatMap((a) => a.tags ?? []))
    ]
    const filteredApplications = savedApplications.filter((app) => {
      if (showFavoritesOnly && !app.isFavorite) return false
      if (activeTagFilter && !(app.tags ?? []).includes(activeTagFilter))
        return false
      return true
    })

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-100 p-4">
        <PreparationPlanModal
          isOpen={preparationPlanModalOpen}
          onClose={() => setPreparationPlanModalOpen(false)}
          content={preparationPlanContent}
          companyName={viewingApplication?.company || saveFormData.company}
          interviewType={
            viewingApplication?.preparationPlan?.interviewType ||
            saveFormData.status
          }
        />

        {/* Detail modal overlay */}
        {viewingApplication && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">
                  Application Details
                </h3>
                <button
                  onClick={() => setViewingApplication(null)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Company
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {viewingApplication.company}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Job Title
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {viewingApplication.jobTitle}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(viewingApplication.status)}`}>
                      {viewingApplication.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Date Applied
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {viewingApplication.date}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Saved At
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {new Date(viewingApplication.createdAt).toLocaleString()}
                  </dd>
                </div>
                {viewingApplication.jobUrl && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Job Posting
                    </dt>
                    <dd className="text-sm mt-0.5">
                      <a
                        href={viewingApplication.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline break-all">
                        {viewingApplication.jobUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {/* Feature 1.3 — Favourite / Tags / Notes */}
              {viewingApplication.isFavorite && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Favourite
                  </span>
                  <p className="text-sm text-gray-900 mt-0.5">⭐ Yes</p>
                </div>
              )}
              {(viewingApplication.tags ?? []).length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingApplication.tags!.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewingApplication.notes && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Notes
                  </span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">
                    {viewingApplication.notes}
                  </p>
                </div>
              )}

              {(viewingApplication.resumeContent ||
                viewingApplication.coverLetterContent) && (
                  <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Documents
                    </p>

                    {/* Resume Download */}
                    {viewingApplication.resumeContent &&
                      viewingApplication.resumeFilename && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                            Resume
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                downloadMarkdownFile(
                                  viewingApplication.resumeFilename,
                                  viewingApplication.resumeContent
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                       bg-white border border-slate-200 text-slate-500 rounded-lg
                                       hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700
                                       active:scale-[0.97] transition-all text-xs font-medium
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
                              <FileText size={12} />
                              <span>MD</span>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await downloadMarkdownAsPdf(
                                    viewingApplication.resumeContent,
                                    viewingApplication.resumeFilename
                                  )
                                } catch (error) {
                                  console.error("PDF export failed:", error)
                                  alert(
                                    "Failed to generate PDF. Please try again."
                                  )
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                       bg-violet-600 text-white rounded-lg shadow-sm
                                       hover:bg-violet-700 active:scale-[0.97]
                                       transition-all text-xs font-medium
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
                              <Download size={12} />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Cover Letter Download */}
                    {viewingApplication.coverLetterContent &&
                      viewingApplication.coverLetterFilename && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                            Cover Letter
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                downloadMarkdownFile(
                                  viewingApplication.coverLetterFilename,
                                  viewingApplication.coverLetterContent
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                       bg-white border border-slate-200 text-slate-500 rounded-lg
                                       hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700
                                       active:scale-[0.97] transition-all text-xs font-medium
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
                              <FileText size={12} />
                              <span>MD</span>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await downloadMarkdownAsPdf(
                                    viewingApplication.coverLetterContent,
                                    viewingApplication.coverLetterFilename
                                  )
                                } catch (error) {
                                  console.error("PDF export failed:", error)
                                  alert(
                                    "Failed to generate PDF. Please try again."
                                  )
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                       bg-indigo-600 text-white rounded-lg shadow-sm
                                       hover:bg-indigo-700 active:scale-[0.97]
                                       transition-all text-xs font-medium
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
                              <Download size={12} />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )}

              {/* Preparation Plan Section */}
              {viewingApplication.preparationPlan && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={16} className="text-amber-500" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Preparation Plan
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {viewingApplication.preparationPlan.interviewType}
                      </p>
                      <p className="text-xs text-gray-500">
                        Generated on{" "}
                        {new Date(
                          viewingApplication.preparationPlan.generatedAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPreparationPlanContent(
                          viewingApplication.preparationPlan!.content
                        )
                        setPreparationPlanModalOpen(true)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                                 bg-gradient-to-r from-amber-500 to-orange-500
                                 text-white rounded-lg hover:opacity-90 transition-opacity">
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6 pt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Saved Applications
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {savedApplications.length} application
                {savedApplications.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {result && (
                <button
                  onClick={() => setView("success")}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg
                             text-gray-600 hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
              )}
              {!result && (
                <button
                  onClick={() => window.close()}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg
                             text-gray-600 hover:bg-gray-50 transition-colors">
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Filter bar */}
          {savedApplications.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {
                  setActiveTagFilter(null)
                  setShowFavoritesOnly(false)
                }}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  !activeTagFilter && !showFavoritesOnly
                    ? "bg-gray-800 border-gray-800 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}>
                All
              </button>
              <button
                onClick={() => {
                  setShowFavoritesOnly((v) => !v)
                  setActiveTagFilter(null)
                }}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  showFavoritesOnly
                    ? "bg-amber-100 border-amber-400 text-amber-800"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}>
                ⭐ Favourites
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTagFilter(activeTagFilter === tag ? null : tag)
                    setShowFavoritesOnly(false)
                  }}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    activeTagFilter === tag
                      ? "bg-purple-100 border-purple-400 text-purple-800"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {savedApplications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <Briefcase size={36} className="text-gray-200" />
              </div>
              <p className="text-gray-600 text-sm font-medium">
                No applications saved yet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Save your first application after generating documents.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No applications match the current filter.
            </p>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Job Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                      Match %
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, idx) => (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-50 ${idx % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {app.isFavorite && (
                            <span title="Favourite" className="text-amber-400">
                              ★
                            </span>
                          )}
                          <span className="font-medium text-gray-900">
                            {app.company}
                          </span>
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open job posting"
                              className="text-gray-300 hover:text-purple-500 transition-colors shrink-0"
                              onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {(app.tags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {app.tags!.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 rounded-full text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {app.jobTitle}
                      </td>
                      <td className="px-4 py-3">
                        {app.matchPercentage != null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${app.matchPercentage >= 70
                              ? "bg-green-100 text-green-800"
                              : app.matchPercentage >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                              }`}>
                            {app.matchPercentage}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {app.date}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <button
                            title="View details"
                            onClick={() => setViewingApplication(app)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button
                            title="Edit"
                            onClick={() =>
                              openSaveForm("applicationsList", app)
                            }
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil size={14} />
                          </button>

                          <div className="w-px h-4 bg-gray-200 mx-1" />
                          {deleteConfirmId === app.id ? (
                            <button
                              onClick={() => handleDeleteApplication(app.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap">
                              Confirm
                            </button>
                          ) : (
                            <button
                              title="Delete"
                              onClick={() => setDeleteConfirmId(app.id)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Form screen (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-100 p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Generate Documents
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Confirm job details and select model
            </p>
          </div>
          <button
            onClick={() => setView("applicationsList")}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg
                       text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap">
            My Applications
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Google, Microsoft"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white">
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                  {model.recommended ? " (Recommended)" : ""} —{" "}
                  {model.description}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Profile: {userProfile.skills.length} skills,{" "}
              {userProfile.workExperience.length} experiences,{" "}
              {userProfile.personalProjects.length} projects,{" "}
              {userProfile.languages?.length ?? 0} languages
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600
                     text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
            Generate CV + Cover Letter
          </button>
        </form>

        {status && (
          <p
            className={`mt-3 text-sm ${status.includes("failed") ||
              status.includes("error") ||
              status.includes("Error")
              ? "text-red-600"
              : "text-purple-600"
              }`}>
            {status}
          </p>
        )}
      </div>
    </div>
  )
}

export default IndexDialog

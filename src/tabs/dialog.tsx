import {
  Briefcase,
  Building2,
  ChevronRight,
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
  },
  {
    text: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky"
  },
  {
    text: "Whether you think you can or you think you can't, you're right.",
    author: "Henry Ford"
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb"
  },
  {
    text: "Do one thing every day that scares you.",
    author: "Eleanor Roosevelt"
  },
  {
    text: "The man who has confidence in himself gains the confidence of others.",
    author: "Hasidic Proverb"
  },
  {
    text: "A year from now you may wish you had started today.",
    author: "Karen Lamb"
  },
  {
    text: "The only limit to our realization of tomorrow is our doubts of today.",
    author: "Franklin D. Roosevelt"
  },
  {
    text: "Act as if what you do makes a difference. It does.",
    author: "William James"
  },
  {
    text: "We may encounter many defeats but we must not be defeated.",
    author: "Maya Angelou"
  },
  {
    text: "I am not a product of my circumstances. I am a product of my decisions.",
    author: "Stephen Covey"
  },
  {
    text: "Opportunities don't happen. You create them.",
    author: "Chris Grosser"
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson"
  },
  {
    text: "The difference between ordinary and extraordinary is that little extra.",
    author: "Jimmy Johnson"
  },
  {
    text: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe"
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

function statusTextClass(status: ApplicationStatus): string {
  switch (status) {
    case "Saved":
      return "text-ink-secondary"
    case "Offer":
      return "text-green-600"
    case "Reject":
      return "text-red-500"
    case "Applied":
      return "text-ink"
    case "HR Interview":
    case "1st Technical Interview":
    case "2nd Technical Interview":
      return "text-sidebar-accent"
    default:
      return "text-ink-secondary"
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
      <div className="min-h-screen bg-canvas flex items-center justify-center p-12">
        <div className="w-full max-w-md bg-white border-2 border-ink p-8 flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[36px]">✨</span>
            <h2 className="text-[20px] font-bold tracking-[0.1em] text-ink uppercase">
              Crafting your documents…
            </h2>
            <p className="text-[13px] text-ink-secondary">This may take a minute</p>
          </div>

          <div className="w-full bg-canvas-divide h-[10px]" style={{ borderRadius: 2 }}>
            <div
              className="h-[10px] bg-sidebar-accent transition-all duration-300 ease-out"
              style={{ width: `${progress}%`, borderRadius: 2 }}
            />
          </div>

          <div
            className="transition-opacity duration-400"
            style={{ opacity: quoteVisible ? 1 : 0 }}>
            <p className="text-[13px] text-ink-secondary italic leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-[12px] text-ink-muted mt-2">— {quote.author}</p>
          </div>
        </div>
      </div>
    )
  }

  // Success screen
  if (view === "success" && result) {
    const pct = result.match.percentage
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        {/* Top Bar */}
        <div className="h-[72px] shrink-0 bg-canvas px-12 flex items-center justify-between border-b-2 border-ink">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-[20px] font-bold tracking-[0.1em] text-ink leading-none uppercase">
              Application Analysis
            </h1>
            <p className="text-[13px] text-ink-secondary leading-none">
              Match scores, strengths, weaknesses and document downloads
            </p>
          </div>
          <button
            onClick={() => window.close()}
            className="w-9 h-9 flex items-center justify-center bg-[#F0EDE8] border border-[#D4CEC5] text-sidebar-item hover:bg-canvas-divide transition-colors"
            style={{ borderRadius: 2 }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-12 py-10 flex flex-col gap-6">
          {/* Hero */}
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="text-[40px]">🎉</span>
            <h2 className="text-[28px] font-bold tracking-[0.05em] text-ink uppercase">
              Documents Ready!
            </h2>
          </div>

          {/* Match Card */}
          <div className="bg-white border-2 border-ink p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-[0.15em] text-ink uppercase">
                Match Score
              </span>
              <span className={`text-[22px] font-bold ${
                pct >= 85 ? "text-sidebar-accent" : pct >= 70 ? "text-ink" : "text-ink-secondary"
              }`}>
                {pct}%
              </span>
            </div>
            <div className="w-full bg-canvas-divide h-[10px]" style={{ borderRadius: 2 }}>
              <div
                className="h-[10px] bg-sidebar-accent transition-all duration-700"
                style={{ width: `${pct}%`, borderRadius: 2 }}
              />
            </div>
            {result.match.summary && (
              <p className="text-[13px] text-[#555555] leading-relaxed">
                {result.match.summary}
              </p>
            )}
          </div>

          {/* Strengths / Weaknesses Row */}
          {((result.match.strengths?.length ?? 0) > 0 ||
            (result.match.weaknesses?.length ?? 0) > 0) && (
            <div className="flex gap-4">
              {(result.match.strengths?.length ?? 0) > 0 && (
                <div className="flex-1 bg-[#EDF5ED] border-2 border-[#2D6A2D] p-5 flex flex-col gap-[10px]">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-[#2D6A2D] uppercase">
                    Strengths
                  </p>
                  <ul className="flex flex-col gap-[6px]">
                    {result.match.strengths.map((s, i) => (
                      <li key={i} className="text-[12px] text-ink leading-[1.5]">
                        ✓&nbsp;&nbsp;{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(result.match.weaknesses?.length ?? 0) > 0 && (
                <div className="flex-1 bg-[#FDEAE4] border-2 border-sidebar-accent p-5 flex flex-col gap-[10px]">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-sidebar-accent uppercase">
                    Weaknesses
                  </p>
                  <ul className="flex flex-col gap-[6px]">
                    {result.match.weaknesses.map((w, i) => (
                      <li key={i} className="text-[12px] text-ink leading-[1.5]">
                        ×&nbsp;&nbsp;{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Improvements Card */}
          {(result.match.improvements?.length ?? 0) > 0 && (
            <div className="bg-[#E8EEF6] border-2 border-[#4A6FA5] px-6 py-5 flex flex-col gap-[10px]">
              <p className="text-[10px] font-bold tracking-[0.15em] text-[#4A6FA5] uppercase">
                Improvements
              </p>
              <ul className="flex flex-col gap-[6px]">
                {result.match.improvements.map((imp, i) => (
                  <li key={i} className="text-[12px] text-ink leading-[1.5]">
                    →&nbsp;&nbsp;{imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Company About Card */}
          {(companyInfo || companyInfoLoading) && (
            <div className="bg-white border border-canvas-divide px-6 py-5 flex flex-col gap-[14px]">
              {companyInfoLoading ? (
                <div className="flex items-center gap-2 animate-pulse">
                  <Building2 className="w-4 h-4 text-ink-secondary" />
                  <span className="text-[14px] font-bold text-ink">
                    Researching {companyName}...
                  </span>
                </div>
              ) : (
                companyInfo && (
                  <>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-ink-secondary" />
                      <h3 className="text-[14px] font-bold text-ink">
                        About {companyName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className="inline-flex items-center gap-[6px] bg-[#F0EDE8] border border-[#D4CEC5] px-[10px] py-[6px] text-[11px] text-[#555555]"
                        style={{ borderRadius: 2 }}>
                        <Building2 className="w-3 h-3 text-ink-secondary" />
                        {companyInfo.industry}
                      </span>
                      <span
                        className="inline-flex items-center gap-[6px] bg-[#F0EDE8] border border-[#D4CEC5] px-[10px] py-[6px] text-[11px] text-[#555555]"
                        style={{ borderRadius: 2 }}>
                        <Users className="w-3 h-3 text-ink-secondary" />
                        {companyInfo.size}
                      </span>
                    </div>

                    {companyInfo.description && (
                      <p className="text-[12px] text-[#555555] leading-[1.6]">
                        {companyInfo.description}
                      </p>
                    )}

                    {companyInfo.notableProjects.length > 0 && (
                      <div>
                        <button
                          onClick={() => setProjectsExpanded((v) => !v)}
                          className="flex items-center gap-1 text-[12px] font-semibold text-sidebar-accent">
                          <ChevronRight
                            className="w-3 h-3 transition-transform duration-200"
                            style={{
                              transform: projectsExpanded
                                ? "rotate(90deg)"
                                : "rotate(0deg)"
                            }}
                          />
                          Notable projects / products (
                          {companyInfo.notableProjects.length})
                        </button>
                        {projectsExpanded && (
                          <ul className="list-disc list-inside text-[12px] text-[#555555] space-y-1 pl-1 mt-2">
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
                          <span
                            className="inline-flex items-center gap-1 bg-[#F0EDE8] border border-[#D4CEC5] px-[10px] py-[6px] text-[11px]"
                            style={{ borderRadius: 2 }}>
                            <span className="text-[#555555]">Glassdoor</span>
                            <span className={companyInfo.ratings.glassdoor >= 3.5 ? "text-green-600" : "text-red-600"}>
                              {companyInfo.ratings.glassdoor}★
                            </span>
                          </span>
                        )}
                        {companyInfo.ratings.indeed && (
                          <span
                            className="inline-flex items-center gap-1 bg-[#F0EDE8] border border-[#D4CEC5] px-[10px] py-[6px] text-[11px]"
                            style={{ borderRadius: 2 }}>
                            <span className="text-[#555555]">Indeed</span>
                            <span className={companyInfo.ratings.indeed >= 3.5 ? "text-green-600" : "text-red-600"}>
                              {companyInfo.ratings.indeed}★
                            </span>
                          </span>
                        )}
                        {companyInfo.ratings.teamlyzer && (
                          <span
                            className="inline-flex items-center gap-1 bg-[#F0EDE8] border border-[#D4CEC5] px-[10px] py-[6px] text-[11px]"
                            style={{ borderRadius: 2 }}>
                            <span className="text-[#555555]">Teamlyzer</span>
                            <span className={companyInfo.ratings.teamlyzer >= 3.5 ? "text-green-600" : "text-red-600"}>
                              {companyInfo.ratings.teamlyzer}★
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          )}

          {/* Download Card */}
          <div className="bg-white border-2 border-ink">
            {/* Resume */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-canvas-divide">
              <span className="text-[11px] font-bold tracking-[0.15em] text-ink uppercase">
                Download Resume
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadMarkdownFile(result.resumeFilename, result.resumeContent)}
                  className="flex items-center gap-[6px] bg-[#F0EDE8] border border-[#D4CEC5] px-[14px] py-2 text-[11px] font-semibold text-[#555555] hover:bg-canvas-divide transition-colors"
                  style={{ borderRadius: 2 }}>
                  <FileText size={14} />
                  MD
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadMarkdownAsPdf(result.resumeContent, result.resumeFilename)
                    } catch (error) {
                      console.error("PDF export failed:", error)
                      alert("Failed to generate PDF. Please try again.")
                    }
                  }}
                  className="flex items-center gap-[6px] bg-sidebar-accent px-[14px] py-2 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ borderRadius: 2 }}>
                  <Download size={14} />
                  PDF
                </button>
              </div>
            </div>
            {/* Cover Letter */}
            <div className="flex items-center justify-between px-6 py-5">
              <span className="text-[11px] font-bold tracking-[0.15em] text-ink uppercase">
                Download Cover Letter
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadMarkdownFile(result.coverLetterFilename, result.coverLetterContent)}
                  className="flex items-center gap-[6px] bg-[#F0EDE8] border border-[#D4CEC5] px-[14px] py-2 text-[11px] font-semibold text-[#555555] hover:bg-canvas-divide transition-colors"
                  style={{ borderRadius: 2 }}>
                  <FileText size={14} />
                  MD
                </button>
                <button
                  onClick={async () => {
                    try {
                      await downloadMarkdownAsPdf(result.coverLetterContent, result.coverLetterFilename)
                    } catch (error) {
                      console.error("PDF export failed:", error)
                      alert("Failed to generate PDF. Please try again.")
                    }
                  }}
                  className="flex items-center gap-[6px] bg-sidebar-accent px-[14px] py-2 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ borderRadius: 2 }}>
                  <Download size={14} />
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* CTA Row */}
          <div className="flex gap-4 pb-2">
            <button
              onClick={() => openSaveForm("success")}
              className="flex-1 flex items-center justify-center py-[14px] bg-ink text-canvas text-[13px] font-semibold tracking-wide uppercase hover:opacity-90 transition-opacity"
              style={{ borderRadius: 2 }}>
              Save Application
            </button>
            <button
              onClick={() => setView("applicationsList")}
              className="flex-1 flex items-center justify-center py-[14px] bg-canvas border-2 border-ink text-ink text-[13px] font-semibold tracking-wide uppercase hover:bg-canvas-divide transition-colors"
              style={{ borderRadius: 2 }}>
              View Saved Applications
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Save form screen
  if (view === "saveForm") {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <PreparationPlanModal
          isOpen={preparationPlanModalOpen}
          onClose={() => setPreparationPlanModalOpen(false)}
          content={preparationPlanContent}
          companyName={saveFormData.company}
          interviewType={saveFormData.status}
          onSave={editingApplication ? savePreparationPlan : undefined}
        />

        {/* Top Bar */}
        <div className="h-[72px] shrink-0 bg-canvas px-12 flex items-center justify-between border-b border-canvas-divide">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-[20px] font-bold tracking-[0.1em] text-ink leading-none">
              {editingApplication ? "EDIT APPLICATION" : "TRACK APPLICATION"}
            </h1>
            <p className="text-[13px] text-ink-secondary leading-none">
              Track your job application
            </p>
          </div>
          <button
            onClick={() => setView(saveFormOrigin)}
            className="w-9 h-9 flex items-center justify-center bg-[#F0EDE8] text-sidebar-item hover:bg-canvas-divide transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-12 py-10 overflow-auto flex justify-center">
          <div className="w-full max-w-lg space-y-5">

            {/* Fields */}
            <div className="space-y-4">
              {/* Company */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                  Company *
                </label>
                <input
                  type="text"
                  value={saveFormData.company}
                  onChange={(e) =>
                    setSaveFormData((d) => ({ ...d, company: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                             focus:outline-none focus:border-ink-secondary transition-colors"
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={saveFormData.jobTitle}
                  onChange={(e) =>
                    setSaveFormData((d) => ({ ...d, jobTitle: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                             focus:outline-none focus:border-ink-secondary transition-colors"
                />
              </div>

              {/* Status + Date (2 columns) */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
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
                    className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                               focus:outline-none focus:border-ink-secondary transition-colors">
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                    Date Applied *
                  </label>
                  <input
                    type="date"
                    value={saveFormData.date}
                    onChange={(e) =>
                      setSaveFormData((d) => ({ ...d, date: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                               focus:outline-none focus:border-ink-secondary transition-colors"
                  />
                </div>
              </div>

              {/* Job URL */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                  Job Posting URL
                </label>
                <input
                  type="url"
                  value={saveFormData.jobUrl}
                  onChange={(e) =>
                    setSaveFormData((d) => ({ ...d, jobUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                             placeholder:text-ink-muted focus:outline-none focus:border-ink-secondary transition-colors"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-canvas-divide" />

            {/* Favourite toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveFormData.isFavorite}
                onChange={(e) =>
                  setSaveFormData((f) => ({ ...f, isFavorite: e.target.checked }))
                }
                className="border-canvas-input-border text-sidebar-accent focus:ring-sidebar-accent"
              />
              <span className="text-[13px] text-ink">
                <span className="text-sidebar-accent">★</span> Mark as favourite
              </span>
            </label>

            {/* Tags */}
            <div>
              <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-2">
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
                      className={`px-3 py-1 text-[11px] font-medium tracking-[0.05em] border transition-colors ${active
                        ? "bg-ink text-white border-ink"
                        : "border-canvas-input-border text-ink-secondary hover:text-ink hover:border-ink-secondary"
                        }`}>
                      {tag}
                    </button>
                  )
                })}
              </div>
              {/* Custom tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {saveFormData.tags
                  .filter((t) => !PRESET_TAGS.includes(t))
                  .map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-sidebar-accent border border-canvas-divide">
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          setSaveFormData((f) => ({
                            ...f,
                            tags: f.tags.filter((x) => x !== t)
                          }))
                        }
                        className="hover:text-ink transition-colors leading-none">
                        ×
                      </button>
                    </span>
                  ))}
              </div>
              <input
                type="text"
                placeholder="Add custom tag, press Enter"
                className="w-full px-4 py-2.5 bg-canvas border border-canvas-input-border text-ink text-sm
                           placeholder:text-ink-muted focus:outline-none focus:border-ink-secondary transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val && !saveFormData.tags.includes(val)) {
                      setSaveFormData((f) => ({ ...f, tags: [...f.tags, val] }))
                    }
                    ; (e.target as HTMLInputElement).value = ""
                  }
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                Notes
              </label>
              <textarea
                rows={3}
                value={saveFormData.notes}
                onChange={(e) =>
                  setSaveFormData((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Interview notes, contacts, reminders…"
                className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                           placeholder:text-ink-muted focus:outline-none focus:border-ink-secondary transition-colors resize-none"
              />
            </div>

            {/* Save docs checkbox (only from success flow) */}
            {saveFormOrigin === "success" && result && (
              <label className="flex items-center gap-2.5 text-[13px] text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveDocs}
                  onChange={(e) => setSaveDocs(e.target.checked)}
                  className="border-canvas-input-border text-sidebar-accent focus:ring-sidebar-accent"
                />
                Save resume and cover letter
              </label>
            )}

            {saveFormError && (
              <p className="text-sm text-red-500">{saveFormError}</p>
            )}

            {/* Preparation Plan */}
            {isInterviewStage(saveFormData.status) &&
              editingApplication &&
              perplexityConfig?.preparationPlanEnabled && (
                <div className="border-t border-canvas-divide pt-5">
                  {editingApplication.preparationPlan &&
                    editingApplication.preparationPlan.interviewType ===
                    saveFormData.status ? (
                    <div className="flex items-center gap-3 p-3 bg-canvas border border-canvas-divide">
                      <Lightbulb size={16} className="text-sidebar-accent shrink-0" />
                      <span className="text-[13px] text-ink flex-1">
                        Preparation plan already generated
                      </span>
                      <button
                        onClick={() => {
                          setPreparationPlanContent(
                            editingApplication.preparationPlan!.content
                          )
                          setPreparationPlanModalOpen(true)
                        }}
                        className="text-[11px] font-semibold tracking-[0.05em] text-sidebar-accent hover:text-ink transition-colors">
                        VIEW PLAN
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generatePreparationPlan()}
                      disabled={generatingPlan}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3
                               bg-sidebar-accent text-white text-[11px] font-semibold tracking-[0.1em]
                               hover:opacity-90 transition-opacity
                               disabled:opacity-50 disabled:cursor-not-allowed">
                      {generatingPlan ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>GENERATING PLAN...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>GENERATE PREPARATION PLAN</span>
                        </>
                      )}
                    </button>
                  )}
                  {planError && (
                    <p className="mt-2 text-sm text-red-500">{planError}</p>
                  )}
                </div>
              )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveApplication}
                className="flex-1 px-4 py-3 bg-ink text-white text-[11px] font-semibold tracking-[0.1em]
                           hover:opacity-80 transition-opacity">
                SAVE
              </button>
              <button
                onClick={() => setView(saveFormOrigin)}
                className="flex-1 px-4 py-3 border border-canvas-input-border text-ink-secondary text-[11px] font-semibold tracking-[0.1em]
                           hover:text-ink hover:border-ink-secondary transition-colors">
                CANCEL
              </button>
            </div>
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
      <div className="min-h-screen bg-canvas flex flex-col">
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
            <div className="w-full max-w-sm bg-white shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[13px] font-bold text-ink uppercase tracking-[0.1em]">
                  Application Details
                </h3>
                <button
                  onClick={() => setViewingApplication(null)}
                  className="w-8 h-8 flex items-center justify-center bg-[#F0EDE8] text-sidebar-item hover:bg-canvas-divide transition-colors">
                  <X size={16} />
                </button>
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Company
                  </dt>
                  <dd className="text-sm text-ink mt-0.5 font-semibold">
                    {viewingApplication.company}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Job Title
                  </dt>
                  <dd className="text-sm text-ink mt-0.5">
                    {viewingApplication.jobTitle}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Status
                  </dt>
                  <dd className="mt-0.5">
                    <span
                      className={`text-[11px] font-semibold tracking-[0.05em] ${statusTextClass(viewingApplication.status)}`}>
                      {viewingApplication.status.toUpperCase()}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Date Applied
                  </dt>
                  <dd className="text-sm text-ink mt-0.5">
                    {viewingApplication.date}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Saved At
                  </dt>
                  <dd className="text-sm text-ink-secondary mt-0.5">
                    {new Date(viewingApplication.createdAt).toLocaleString()}
                  </dd>
                </div>
                {viewingApplication.jobUrl && (
                  <div>
                    <dt className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                      Job Posting
                    </dt>
                    <dd className="text-sm mt-0.5">
                      <a
                        href={viewingApplication.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sidebar-accent hover:underline break-all">
                        {viewingApplication.jobUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {viewingApplication.isFavorite && (
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Favourite
                  </span>
                  <p className="text-sm text-sidebar-accent mt-0.5">★ Yes</p>
                </div>
              )}
              {(viewingApplication.tags ?? []).length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewingApplication.tags!.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-sidebar-accent font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewingApplication.notes && (
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                    Notes
                  </span>
                  <p className="text-sm text-ink whitespace-pre-wrap mt-0.5">
                    {viewingApplication.notes}
                  </p>
                </div>
              )}

              {(viewingApplication.resumeContent ||
                viewingApplication.coverLetterContent) && (
                  <div className="mt-5 pt-4 border-t border-canvas-divide space-y-3">
                    <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-2">
                      Documents
                    </p>

                    {viewingApplication.resumeContent &&
                      viewingApplication.resumeFilename && (
                        <div>
                          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.15em] mb-1.5">
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
                                       bg-canvas border border-canvas-divide text-ink-secondary
                                       hover:bg-canvas-divide hover:text-ink
                                       active:scale-[0.97] transition-all text-xs font-medium">
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
                                       bg-sidebar-accent text-white
                                       hover:opacity-90 active:scale-[0.97]
                                       transition-all text-xs font-semibold">
                              <Download size={12} />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      )}

                    {viewingApplication.coverLetterContent &&
                      viewingApplication.coverLetterFilename && (
                        <div>
                          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.15em] mb-1.5">
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
                                       bg-canvas border border-canvas-divide text-ink-secondary
                                       hover:bg-canvas-divide hover:text-ink
                                       active:scale-[0.97] transition-all text-xs font-medium">
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
                                       bg-sidebar-accent text-white
                                       hover:opacity-90 active:scale-[0.97]
                                       transition-all text-xs font-semibold">
                              <Download size={12} />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )}

              {viewingApplication.preparationPlan && (
                <div className="mt-5 pt-4 border-t border-canvas-divide">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={14} className="text-sidebar-accent" />
                    <p className="text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                      Preparation Plan
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-canvas border border-canvas-divide">
                    <div>
                      <p className="text-[11px] font-semibold text-ink uppercase tracking-[0.05em]">
                        {viewingApplication.preparationPlan.interviewType}
                      </p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        Generated{" "}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold
                                 text-sidebar-accent hover:text-ink transition-colors">
                      <Eye size={14} />
                      <span>VIEW</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="h-[72px] shrink-0 bg-canvas px-12 flex items-center justify-between border-b border-canvas-divide">
          <div className="flex flex-col gap-[3px]">
            <h1 className="text-3xl font-bold tracking-[0.1em] text-ink leading-none">
              APPLICATIONS
            </h1>
            <p className="text-[13px] text-ink-secondary leading-none">
              Saved applications and pipeline status
            </p>
          </div>
          <button
            onClick={result ? () => setView("success") : () => window.close()}
            className="w-9 h-9 flex items-center justify-center bg-[#F0EDE8] text-sidebar-item hover:bg-canvas-divide transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-6 px-12 py-10 overflow-auto">

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setActiveTagFilter(null)
                setShowFavoritesOnly(false)
              }}
              className={`px-4 py-2 text-[11px] font-semibold tracking-[0.1em] transition-colors ${!activeTagFilter && !showFavoritesOnly
                ? "bg-ink text-white"
                : "text-sidebar-item hover:text-ink"
                }`}>
              ALL
            </button>
            <button
              onClick={() => {
                setShowFavoritesOnly((v) => !v)
                setActiveTagFilter(null)
              }}
              className={`px-4 py-2 text-[11px] font-medium tracking-[0.1em] transition-colors ${showFavoritesOnly
                ? "bg-ink text-white"
                : "text-sidebar-item hover:text-ink"
                }`}>
              ★  FAVOURITES
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setActiveTagFilter(activeTagFilter === tag ? null : tag)
                  setShowFavoritesOnly(false)
                }}
                className={`px-4 py-2 text-[11px] font-medium tracking-[0.1em] transition-colors ${activeTagFilter === tag
                  ? "bg-ink text-white"
                  : "text-sidebar-item hover:text-ink"
                  }`}>
                {tag}
              </button>
            ))}
            <button
              onClick={() => openSaveForm("applicationsList")}
              className="ml-auto px-4 py-2 text-[11px] font-semibold tracking-[0.1em] text-sidebar-accent hover:text-ink transition-colors">
              + TRACK APPLICATION
            </button>
          </div>

          {/* Table / Empty States */}
          {savedApplications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Briefcase size={36} className="text-canvas-divide" />
              <div className="text-center">
                <p className="text-[13px] font-semibold text-ink">
                  No applications saved yet
                </p>
                <p className="text-[12px] text-ink-muted mt-1">
                  Save your first application after generating documents.
                </p>
              </div>
              <button
                onClick={() => openSaveForm("applicationsList")}
                className="mt-2 px-4 py-2 text-[11px] font-semibold tracking-[0.1em] text-sidebar-accent hover:text-ink transition-colors">
                + TRACK APPLICATION
              </button>
            </div>
          ) : filteredApplications.length === 0 ? (
            <p className="text-[13px] text-ink-secondary text-center py-6">
              No applications match the current filter.
            </p>
          ) : (
            <div className="bg-white border-2 border-ink">
              {/* Table Header */}
              <div className="flex items-center bg-canvas px-4 py-3 border-b border-canvas-divide">
                <span className="w-40 shrink-0 text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                  COMPANY
                </span>
                <span className="flex-1 text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                  JOB TITLE
                </span>
                <span className="w-[88px] shrink-0 text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                  MATCH %
                </span>
                <span className="w-[140px] shrink-0 text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                  STATUS
                </span>
                <span className="w-[120px] shrink-0 text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                  DATE
                </span>
                <span className="w-[120px] shrink-0 text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em]">
                  ACTIONS
                </span>
              </div>

              {/* Table Rows */}
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center px-4 py-[14px] border-b border-canvas-divide last:border-b-0 hover:bg-canvas/60 transition-colors ">
                  {/* Company */}
                  <div className="w-40 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {app.isFavorite && (
                        <span className="text-sidebar-accent text-xs leading-none">★</span>
                      )}
                      <span className="text-[13px] font-semibold text-ink">
                        {app.company}
                      </span>
                    </div>
                    {(app.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {app.tags!.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] text-sidebar-accent font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Job Title */}
                  <span className="flex-1 text-[13px] text-ink">
                    {app.jobTitle}
                  </span>

                  {/* Match % */}
                  <span
                    className={`w-[88px] shrink-0 text-[12px] font-semibold ${app.matchPercentage == null
                      ? "text-ink-muted"
                      : app.matchPercentage >= 85
                        ? "text-sidebar-accent"
                        : app.matchPercentage >= 70
                          ? "text-ink"
                          : "text-ink-secondary"
                      }`}>
                    {app.matchPercentage != null
                      ? `${app.matchPercentage}%`
                      : "—"}
                  </span>

                  {/* Status */}
                  <span
                    className={`w-[140px] shrink-0 text-[11px] font-semibold tracking-[0.05em] ${statusTextClass(app.status)}`}>
                    {app.status.toUpperCase()}
                  </span>

                  {/* Date */}
                  <span className="w-[120px] shrink-0 text-[12px] text-ink-secondary">
                    {app.date}
                  </span>

                  {/* Actions */}
                  <div className="w-[120px] shrink-0 flex items-center gap-2">
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open job posting"
                        className="text-[#9B9490] hover:text-ink transition-colors">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button
                      title="View details"
                      onClick={() => setViewingApplication(app)}
                      className="text-[#9B9490] hover:text-ink transition-colors">
                      <Eye size={16} />
                    </button>
                    <button
                      title="Edit"
                      onClick={() => openSaveForm("applicationsList", app)}
                      className="text-[#9B9490] hover:text-ink transition-colors">
                      <Pencil size={16} />
                    </button>
                    {deleteConfirmId === app.id ? (
                      <button
                        onClick={() => handleDeleteApplication(app.id)}
                        className="text-[10px] font-semibold text-sidebar-accent hover:text-ink transition-colors whitespace-nowrap tracking-[0.05em]">
                        CONFIRM
                      </button>
                    ) : (
                      <button
                        title="Delete"
                        onClick={() => setDeleteConfirmId(app.id)}
                        className="text-sidebar-accent hover:text-ink transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Form screen (default)
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top Bar */}
      <div className="h-[72px] shrink-0 bg-canvas px-12 flex items-center justify-between border-b border-canvas-divide">
        <div className="flex flex-col gap-[3px]">
          <h1 className="text-[20px] font-bold tracking-[0.1em] text-ink leading-none">
            GENERATE DOCUMENTS
          </h1>
          <p className="text-[13px] text-ink-secondary leading-none">
            Confirm job details and select model
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("applicationsList")}
            className="text-[11px] font-semibold tracking-[0.1em] text-sidebar-accent hover:text-ink transition-colors">
            MY APPLICATIONS
          </button>
          <button
            onClick={() => window.close()}
            className="w-9 h-9 flex items-center justify-center bg-[#F0EDE8] text-sidebar-item hover:bg-canvas-divide transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-12 py-10 overflow-auto flex justify-center">
        <div className="w-full max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Google, Microsoft"
                required
                className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                           placeholder:text-ink-muted focus:outline-none focus:border-ink-secondary transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                required
                className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                           placeholder:text-ink-muted focus:outline-none focus:border-ink-secondary transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink-secondary uppercase tracking-[0.15em] mb-1.5">
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm
                           focus:outline-none focus:border-ink-secondary transition-colors">
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                    {model.recommended ? " (Recommended)" : ""} —{" "}
                    {model.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-canvas-divide pt-4">
              <p className="text-[12px] text-ink-muted">
                Profile: {userProfile.skills.length} skills,{" "}
                {userProfile.workExperience.length} experiences,{" "}
                {userProfile.personalProjects.length} projects,{" "}
                {userProfile.languages?.length ?? 0} languages
              </p>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-ink text-white text-[11px] font-semibold tracking-[0.1em]
                         hover:opacity-80 transition-opacity">
              GENERATE CV + COVER LETTER
            </button>
          </form>

          {status && (
            <p className={`mt-3 text-sm ${
              status.includes("failed") || status.includes("error") || status.includes("Error")
                ? "text-red-500"
                : "text-sidebar-accent"
            }`}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default IndexDialog

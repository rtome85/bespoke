import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  Mail,
  Sparkles,
  TrendingUp,
  Users,
  X
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import type { CompanyInfo } from "~api/perplexityClient"
import { BackLink } from "~components/BackLink"
import { ScoreGauge } from "~components/ScoreGauge"
import { seedCompanyResearch } from "~lib/interviews/companyResearch"
import { STORAGE_KEYS } from "~storage/keys"
import {
  mutateSavedApplications,
  setApplicationStatus
} from "~storage/savedApplications"
import { PROVIDER_META } from "~types/config"
import type { PerplexityConfig, RouteTarget } from "~types/config"
import type { DocumentPreviewDraft } from "~types/documentPreview"
import {
  APPLICATION_STATUSES,
  DEFAULT_USER_PROFILE,
  type ApplicationStatus,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"

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
  match: {
    percentage: number
    summary: string
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
  }
  // Present only after the user requests document generation (step 2)
  resumeContent?: string
  resumeFilename?: string
  coverLetterContent?: string
  coverLetterFilename?: string
}

type View = "form" | "loading" | "success" | "saveForm" | "extracting"

// The report flow (form/loading/success) runs inside the side panel on
// Chrome, which has no window to close — instead disable the panel for this
// tab. Firefox (MV2) has no chrome.sidePanel: the report is still a popup
// window there, so just close it.
async function closeSidePanel() {
  if (typeof chrome.sidePanel === "undefined") {
    window.close()
    return
  }
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabId = tabs[0]?.id
  if (tabId !== undefined) {
    await chrome.sidePanel.setOptions({ tabId, enabled: false })
  }
}

// Opens the current Applications list in the app shell.
function openApplicationsList() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("options.html#/applications")
  })
}

// One row in the "Skill gaps" list of the pre-generate Strengthen step — a
// weakness the match analysis surfaced, with an inline form to add the
// skill (and years) that closes it. Collapses to a confirmed state once added.
function GapRow({
  text,
  added,
  onAdd
}: {
  text: string
  added: { name: string; years: number } | null
  onAdd: (name: string, years: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [years, setYears] = useState(1)

  if (added) {
    return (
      <div className="flex items-center gap-aa-3 px-aa-4 py-aa-3">
        <CheckCircle2 className="w-[18px] h-[18px] text-aa-success shrink-0" />
        <div className="flex-1 flex flex-col gap-[2px] min-w-0">
          <span className="text-[14px] font-semibold text-aa-text-primary truncate">
            {added.name}
          </span>
          <span className="text-[12px] text-aa-text-secondary truncate">
            {text}
          </span>
        </div>
        <span className="text-[12px] font-semibold text-aa-success-strong shrink-0">
          Added
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-aa-3 px-aa-4 py-aa-3">
      <div className="flex items-center gap-aa-3">
        <AlertTriangle className="w-[18px] h-[18px] text-aa-error shrink-0" />
        <span className="flex-1 text-[13px] text-aa-text-secondary leading-[1.4]">
          {text}
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-aa-pill border border-aa-border px-[12px] py-[6px] text-[12px] font-semibold text-aa-primary hover:bg-aa-primary-soft transition-colors">
          {open ? "Cancel" : "+ Add"}
        </button>
      </div>
      {open && (
        <div className="flex items-center gap-aa-2 pl-[30px]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skill you have"
            className="flex-1 min-w-0 rounded-aa-md border border-aa-border px-aa-3 py-[6px] text-[13px] text-aa-text-primary bg-aa-surface focus:outline-none focus:border-aa-primary"
          />
          <input
            type="number"
            min={0}
            max={40}
            value={years}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              setYears(Number.isFinite(parsed) ? Math.min(40, Math.max(0, parsed)) : 0)
            }}
            className="w-[52px] rounded-aa-md border border-aa-border px-aa-2 py-[6px] text-[13px] text-aa-text-primary bg-aa-surface focus:outline-none focus:border-aa-primary"
          />
          <span className="text-[12px] text-aa-text-secondary shrink-0">
            yrs
          </span>
          <button
            disabled={!name.trim()}
            onClick={() => {
              onAdd(name.trim(), years)
              setOpen(false)
            }}
            className="shrink-0 rounded-aa-md bg-aa-primary px-[12px] py-[6px] text-[12px] font-semibold text-aa-text-on-primary disabled:opacity-40 hover:bg-aa-primary-hover transition-colors">
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

function IndexDialog() {
  const initialView = new URLSearchParams(window.location.search).get(
    "view"
  ) as View | null
  const [view, setView] = useState<View>(initialView ?? "form")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [routingLabels, setRoutingLabels] = useState<{
    scoring?: string
    drafting?: string
  }>({})
  const [userProfile, setUserProfile] =
    useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  // Set once extraction lands with usable data, so the match analysis
  // kicks off automatically instead of stopping on the review form.
  const [autoAnalyze, setAutoAnalyze] = useState(false)
  const [progress, setProgress] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * QUOTES.length)
  )
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsProgress, setDocsProgress] = useState(0)
  const [docsError, setDocsError] = useState("")
  const [generatingDocsForApp, setGeneratingDocsForApp] = useState(false)
  const [docsGenError, setDocsGenError] = useState("")
  const [previewError, setPreviewError] = useState("")
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false)
  const [projectsExpanded, setProjectsExpanded] = useState(false)
  const [matchAccordionOpen, setMatchAccordionOpen] = useState<
    "strengths" | "weaknesses" | "improvements" | null
  >("strengths")
  // What the user decided to do with this match, right after reading the
  // analysis — gates the document-generation and save CTAs below it.
  const [triageDecision, setTriageDecision] = useState<
    "apply" | "save" | "discard" | null
  >(null)
  // Pre-generate "Strengthen this application" step — keyed by index into
  // result.match.weaknesses. Survives a "back to report" / re-apply round
  // trip so the user doesn't lose what they already filled in.
  const [addedGapSkills, setAddedGapSkills] = useState<
    Record<number, { name: string; years: number }>
  >({})
  const [jobDescription, setJobDescription] = useState("")
  const [perplexityConfig, setPerplexityConfig] =
    useState<PerplexityConfig | null>(null)

  // Application tracker state
  const [savedApplications, setSavedApplications] = useState<
    SavedApplication[]
  >([])
  const [editingApplication, setEditingApplication] =
    useState<SavedApplication | null>(null)
  const [pendingJobUrl, setPendingJobUrl] = useState("")
  const [saveFormData, setSaveFormData] = useState({
    company: "",
    jobTitle: "",
    status: "Saved" as ApplicationStatus,
    date: new Date().toISOString().split("T")[0],
    jobUrl: "",
    tags: [] as string[],
    notes: ""
  })
  const [saveDocs, setSaveDocs] = useState(true)
  const [saveFormError, setSaveFormError] = useState("")

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const docsProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )
  // Bumped whenever a new extraction/analysis run starts, so a stale
  // runAnalysis call that resolves after being superseded can detect it's
  // no longer the latest request and skip applying its result.
  const analysisRequestIdRef = useRef(0)

  useEffect(() => {
    chrome.storage.local.get(
      [
        "userProfile",
        "pendingJobData",
        "savedApplications",
        "perplexityConfig",
        "modelRouting"
      ],
      (res) => {
        if (res.modelRouting) {
          const fmt = (t?: RouteTarget) =>
            t
              ? `${PROVIDER_META[t.provider]?.name ?? t.provider} · ${t.model}`
              : undefined
          setRoutingLabels({
            scoring: fmt(res.modelRouting.scoring),
            drafting: fmt(res.modelRouting.drafting)
          })
        }
        if (res.userProfile) setUserProfile(res.userProfile)
        if (res.savedApplications) setSavedApplications(res.savedApplications)
        if (res.perplexityConfig) setPerplexityConfig(res.perplexityConfig)

        if (res.pendingJobData?.extracting) {
          analysisRequestIdRef.current++
          setView("extracting")
          setProgress(0)
        } else {
          const extractedCompany = res.pendingJobData?.companyName || ""
          const extractedTitle = res.pendingJobData?.jobTitle || ""
          if (extractedCompany) setCompanyName(extractedCompany)
          if (extractedTitle) setJobTitle(extractedTitle)
          if (res.pendingJobData?.tabUrl)
            setPendingJobUrl(res.pendingJobData.tabUrl)
          if (res.pendingJobData?.selectedText)
            setJobDescription(res.pendingJobData.selectedText)

          // Extraction can finish before this initial read runs (e.g. the
          // LinkedIn CSS-selector path has no LLM round-trip to wait out),
          // so treat already-completed data the same as the live update in
          // the storage listener below and auto-continue to analysis.
          // Scoped to the default side-panel entry (no explicit ?view=) so
          // the standalone Applications window — which never sets
          // pendingJobData itself — can't be hijacked by leftover data from
          // an earlier match check.
          if (
            !initialView &&
            extractedCompany.trim() &&
            extractedTitle.trim()
          ) {
            setAutoAnalyze(true)
          }
        }
      }
    )
  }, [])

  useEffect(() => {
    // Registered for the page's whole lifetime, not just while view is
    // "extracting" — the side panel is a single persistent page per tab, so a
    // second "Check my match" trigger while the panel is already showing
    // "form"/"success" must still be able to snap it back to "extracting".
    const applyData = (data: Record<string, unknown> | null) => {
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
      const extractedCompany = (data.companyName as string) || ""
      const extractedTitle = (data.jobTitle as string) || ""
      const extractedDescription = (data.selectedText as string) || ""
      if (data.tabUrl) setPendingJobUrl(data.tabUrl as string)
      setCompanyName(extractedCompany)
      setJobTitle(extractedTitle)
      setJobDescription(extractedDescription)

      // Extraction produced enough to work with — skip the review form and
      // go straight into match analysis. Missing fields fall back to the
      // form so the user can fill them in manually.
      if (extractedCompany.trim() && extractedTitle.trim()) {
        setAutoAnalyze(true)
      } else {
        setStatus("Unable to extract the details. Please fill in manually.")
        setView("form")
      }
    }

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      const change = changes["pendingJobData"]
      if (change) applyData(change.newValue)
    }

    chrome.storage.onChanged.addListener(listener)

    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    if (loading) setView("loading")
  }, [loading])

  // Progress bar and quotes both run continuously across the extracting →
  // analyzing handoff (one simulated run, not reset in between) so the two
  // loading screens read as a single unbroken step.
  useEffect(() => {
    const inProgress = view === "extracting" || loading

    if (inProgress) {
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          const increment = Math.max(0.3, (90 - prev) * 0.04)
          return Math.min(90, prev + increment)
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
  }, [view, loading])

  // Simulated progress for step-2 document generation
  useEffect(() => {
    if (docsLoading) {
      setDocsProgress(0)

      docsProgressIntervalRef.current = setInterval(() => {
        setDocsProgress((prev) => {
          if (prev >= 85) return prev
          const increment = Math.max(0.3, (85 - prev) * 0.04)
          return Math.min(85, prev + increment)
        })
      }, 300)
    } else if (docsProgressIntervalRef.current) {
      clearInterval(docsProgressIntervalRef.current)
      docsProgressIntervalRef.current = null
    }

    return () => {
      if (docsProgressIntervalRef.current)
        clearInterval(docsProgressIntervalRef.current)
    }
  }, [docsLoading])

  // Picks up edits made in the standalone preview/edit window (see
  // handleOpenDocumentPreview below) — that window is the sole writer of
  // this key once open, so any change here originated there.
  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local" || !(STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT in changes))
        return
      const next = changes[STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT]
        .newValue as DocumentPreviewDraft | undefined
      if (!next) return
      setResult((prev) =>
        prev
          ? {
              ...prev,
              resumeContent: next.resumeContent,
              coverLetterContent: next.coverLetterContent
            }
          : prev
      )
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

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

          const info: CompanyInfo = {
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
          }
          setCompanyInfo(info)
          // Seed the Prep engine's cache so it usually won't re-hit Perplexity.
          void seedCompanyResearch(companyName, info)
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

  // Shared by the manual "Check my match" submit and the automatic
  // post-extraction flow — takes explicit values rather than reading
  // component state, since the auto-triggered call fires in the same
  // render pass that sets companyName/jobTitle/jobDescription.
  const runAnalysis = async (
    company: string,
    title: string,
    description: string
  ) => {
    const requestId = ++analysisRequestIdRef.current

    setLoading(true)
    setStatus("")
    setDocsError("")
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

      // A newer extraction/analysis run superseded this one while it was
      // in flight — drop the response instead of clobbering fresher state.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim() || !jobTitle.trim()) {
      setStatus("Please fill in company name and job title")
      return
    }

    await runAnalysis(companyName, jobTitle, jobDescription)
  }

  // Fires once extraction lands with usable company/job title, launching
  // match analysis straight away instead of stopping on the review form.
  useEffect(() => {
    if (!autoAnalyze) return
    setAutoAnalyze(false)
    runAnalysis(companyName, jobTitle, jobDescription)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze])

  // Adds a skill the user says closes a gap the match analysis flagged —
  // reflected immediately in this session's userProfile (so it feeds the
  // generation call below) and persisted to storage so it sticks for future
  // applications too.
  const handleAddGapSkill = (index: number, name: string, years: number) => {
    setAddedGapSkills((prev) => ({ ...prev, [index]: { name, years } }))
    setUserProfile((prev) => {
      if (prev.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        return prev
      }
      const updated = {
        ...prev,
        skills: [
          ...prev.skills,
          { id: crypto.randomUUID(), name, yearsOfExperience: years }
        ]
      }
      chrome.storage.local.set({ userProfile: updated })
      return updated
    })
  }

  // Step 2: generate CV + cover letter once the user has reviewed the match
  const handleGenerateDocuments = async () => {
    setDocsLoading(true)
    setDocsError("")

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
        setDocsProgress(100)
        setTimeout(() => {
          setResult((prev) => (prev ? { ...prev, ...response.data } : prev))
          setDocsLoading(false)
        }, 400)
      } else {
        setDocsError(
          response?.message || "Generation failed. Please try again."
        )
        setDocsLoading(false)
      }
    } catch (error) {
      setDocsError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
      setDocsLoading(false)
    }
  }

  // Generates CV + cover letter for an already-saved application that was
  // tracked via "Save for later" without documents — reuses the jobDescription
  // persisted at save time instead of the (now gone) in-memory analysis result.
  const generateDocumentsForApplication = async () => {
    if (!editingApplication?.jobDescription) return

    setGeneratingDocsForApp(true)
    setDocsGenError("")

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
        const updatedApp: SavedApplication = {
          ...editingApplication,
          ...response.data
        }
        const updatedList = await mutateSavedApplications((current) =>
          current.map((a) => (a.id === updatedApp.id ? updatedApp : a))
        )
        setSavedApplications(updatedList)
        setEditingApplication(updatedApp)
      } else {
        setDocsGenError(
          response?.message || "Generation failed. Please try again."
        )
      }
    } catch (error) {
      setDocsGenError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
    } finally {
      setGeneratingDocsForApp(false)
    }
  }

  // Seeds the storage bridge with the current docs, then asks the
  // background worker to open (or focus) the standalone preview window.
  const handleOpenDocumentPreview = async (
    tab: "resume" | "coverLetter",
    docs: {
      resumeContent: string
      resumeFilename: string
      coverLetterContent: string
      coverLetterFilename: string
    }
  ) => {
    setPreviewError("")
    const draft: DocumentPreviewDraft = { ...docs, activeTab: tab }
    await chrome.storage.local.set({
      [STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT]: draft
    })
    const response = await sendToBackground({ name: "openDocumentPreview" })
    if (!response?.success) {
      setPreviewError(
        response?.message || "Could not open the preview window."
      )
    }
  }

  const openSaveForm = (
    app: SavedApplication | null = null,
    defaultStatus: ApplicationStatus = "Saved"
  ) => {
    setEditingApplication(app)

    if (!app) {
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
        notes: app.notes ?? ""
      })
    } else {
      setSaveFormData({
        company: companyName,
        jobTitle: jobTitle,
        status: defaultStatus,
        date: new Date().toISOString().split("T")[0],
        jobUrl: pendingJobUrl,
        tags: [],
        notes: ""
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
      !editingApplication && result?.resumeContent && saveDocs
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

    // A status change on an existing application needs the shared round
    // reconciliation (auto-create the HR stub on entering "Interviewing",
    // drop a still-pristine stub on rolling back out of it).
    const editId = editingApplication?.id
    const statusChanged =
      !!editingApplication && editingApplication.status !== saveFormData.status

    const now = new Date().toISOString()
    void mutateSavedApplications((current) =>
      editingApplication
        ? current.map((a) =>
            a.id === editingApplication.id
              ? {
                  ...a,
                  ...saveFormData,
                  jobUrl: saveFormData.jobUrl || undefined,
                  // Bump only when the status actually changed
                  statusUpdatedAt:
                    saveFormData.status !== a.status
                      ? now
                      : a.statusUpdatedAt ?? a.createdAt
                }
              : a
          )
        : [
            ...current,
            {
              ...saveFormData,
              jobUrl: saveFormData.jobUrl || undefined,
              ...docs,
              ...matchData,
              id: crypto.randomUUID(),
              createdAt: now,
              statusUpdatedAt: now
            }
          ]
    ).then(async (list) => {
      if (statusChanged && editId) {
        await setApplicationStatus(editId, saveFormData.status)
        const res = await chrome.storage.local.get("savedApplications")
        setSavedApplications(
          Array.isArray(res.savedApplications) ? res.savedApplications : list
        )
      } else {
        setSavedApplications(list)
      }
    })
    openApplicationsList()
    setView("success")
  }

  const matchColor = (pct: number) => {
    if (pct >= 70) return "bg-green-500"
    if (pct >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Analysis splash — shared by the "extracting" and "loading" steps.
  // Kept as a render helper (not a nested component) so the progress bar and
  // quote cross-fade reconcile across renders instead of remounting.
  const renderAnalysisSplash = (title: string, subtitle: string) => {
    const quote = QUOTES[quoteIndex]
    return (
      <div className="min-h-screen bg-aa-surface-subtle flex items-center justify-center p-aa-6 font-aa text-aa-text-primary">
        <div className="w-full max-w-[380px] bg-aa-surface border border-aa-border rounded-aa-xl px-aa-8 py-aa-10 flex flex-col items-center gap-aa-6 text-center">
          <div className="flex flex-col items-center gap-aa-2">
            <h1 className="text-[22px] font-bold tracking-[-0.3px] leading-[1.25]">
              {title}
            </h1>
            <p className="text-[14px] text-aa-text-secondary">{subtitle}</p>
          </div>

          <div className="w-full bg-aa-neutral-200 h-[10px] rounded-aa-pill overflow-hidden">
            <div
              className="h-full bg-aa-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="transition-opacity duration-500 ease-out"
            style={{ opacity: quoteVisible ? 1 : 0 }}>
            <p className="text-[14px] italic leading-[1.6] text-aa-neutral-600">
              "{quote.text}"
            </p>
            <p className="mt-aa-2 text-[12px] text-aa-neutral-500">
              — {quote.author}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (view === "extracting") {
    return renderAnalysisSplash(
      "Extracting job details…",
      "Reading the job posting with AI"
    )
  }

  if (view === "loading") {
    return renderAnalysisSplash(
      "Analyzing your match…",
      "Scoring your profile against the job"
    )
  }

  // Success screen
  if (view === "success" && result) {
    const pct = result.match.percentage
    // Semantic score reading (ApplyAI tokens): weak / moderate / strong.
    // `scoreFill` is the light gauge fill; `scoreInk` the legible text/border
    // pair; both stay distinct from the brand accent so the score reads as a
    // signal, not a button.
    const scoreTier = pct >= 75 ? "strong" : pct >= 50 ? "moderate" : "weak"
    const scoreFill =
      scoreTier === "strong"
        ? "var(--aa-success)"
        : scoreTier === "moderate"
          ? "var(--aa-warning)"
          : "var(--aa-error)"
    const scoreInk =
      scoreTier === "strong"
        ? "var(--aa-success-strong)"
        : scoreTier === "moderate"
          ? "var(--aa-warning-strong)"
          : "var(--aa-error-strong)"
    const scoreBand =
      scoreTier === "strong"
        ? "Strong match"
        : scoreTier === "moderate"
          ? "Moderate match"
          : "Weak match"
    const docs =
      result.resumeContent &&
      result.resumeFilename &&
      result.coverLetterContent &&
      result.coverLetterFilename
        ? {
            resumeContent: result.resumeContent,
            resumeFilename: result.resumeFilename,
            coverLetterContent: result.coverLetterContent,
            coverLetterFilename: result.coverLetterFilename
          }
        : null
    return (
      <div className="min-h-screen bg-aa-surface flex flex-col font-aa text-aa-text-primary">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-aa-6 pt-[36px] pb-aa-8 flex flex-col gap-aa-6">
          {/* Header — name/title, plus a compact score gauge once Apply
              collapses the full score card below into this row. */}
          <div className="flex items-center justify-between gap-aa-4">
            <div className="flex flex-col gap-[6px]">
              <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.4px] text-aa-text-primary">
                {userProfile.personalInfo?.fullName || "Match report"}
              </h1>
              <p className="text-[13px] leading-[1.4] text-aa-text-secondary">
                {jobTitle || "This role"}
                {companyName ? ` — ${companyName}` : ""}
              </p>
            </div>
            <div
              className={`overflow-hidden shrink-0 transition-all duration-500 ease-in-out ${
                triageDecision === "apply"
                  ? "w-[60px] opacity-100 scale-100"
                  : "w-0 opacity-0 scale-75"
              }`}>
              <ScoreGauge
                percentage={pct}
                ringColor={scoreFill}
                textColor={scoreInk}
              />
            </div>
          </div>

          {/* Report vs. Strengthen-step are two mutually-exclusive collapsing
              panes sharing one gap-less wrapper — only one ever has real
              height, so there's no leftover flex `gap` reserved around
              whichever one is currently collapsed to zero. */}
          <div className="flex flex-col">
          {/* Score card + breakdown + company research fade/collapse away
              once the user applies — the Strengthen step below takes over
              as the thing to act on, and "go back to report" reverses this. */}
          <div
            className={`flex flex-col gap-aa-6 overflow-hidden transition-all duration-500 ease-in-out ${
              triageDecision === "apply"
                ? "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                : "max-h-[3000px] opacity-100 translate-y-0"
            }`}>
          {/* Score panel — number, gauge and the analyst's read, on one surface */}
          <div className="bg-aa-surface-subtle rounded-aa-lg p-aa-6 flex flex-col gap-aa-4">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-[1px]">
                <span
                  className="text-[56px] font-bold leading-none tracking-[-1.5px]"
                  style={{ color: scoreInk }}>
                  {pct}
                </span>
                <span className="text-[22px] font-bold leading-[1.35] text-aa-text-secondary">
                  %
                </span>
              </div>
              <span
                className="inline-flex items-center rounded-aa-pill border px-[10px] py-[5px] text-[12px] font-semibold"
                style={{ color: scoreInk, borderColor: scoreInk }}>
                {scoreBand}
              </span>
            </div>

            <div className="flex flex-col gap-aa-2">
              <div className="flex gap-[3px]">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-[10px] rounded-[2px] transition-colors duration-500"
                    style={{
                      backgroundColor:
                        i < Math.round(pct / 5)
                          ? scoreFill
                          : "var(--aa-neutral-200)"
                    }}
                  />
                ))}
              </div>
            </div>

            {result.match.summary && (
              <p className="text-[14px] leading-[1.55] text-aa-neutral-700">
                {result.match.summary}
              </p>
            )}
          </div>

          {/* Breakdown — one bordered container, collapsible rows */}
          {((result.match.strengths?.length ?? 0) > 0 ||
            (result.match.weaknesses?.length ?? 0) > 0 ||
            (result.match.improvements?.length ?? 0) > 0) && (
            <div className="bg-aa-surface rounded-aa-lg border border-aa-border overflow-hidden flex flex-col">
              {(
                [
                  {
                    key: "strengths",
                    label: "Strengths",
                    color: "var(--aa-success-strong)",
                    Icon: CheckCircle2,
                    marker: "✓",
                    items: result.match.strengths ?? []
                  },
                  {
                    key: "weaknesses",
                    label: "Weaknesses",
                    color: "var(--aa-error-strong)",
                    Icon: AlertTriangle,
                    marker: "×",
                    items: result.match.weaknesses ?? []
                  },
                  {
                    key: "improvements",
                    label: "Improvements",
                    color: "var(--aa-secondary)",
                    Icon: TrendingUp,
                    marker: "→",
                    items: result.match.improvements ?? []
                  }
                ] as const
              )
                .filter((row) => row.items.length > 0)
                .map((row, idx) => {
                  const open = matchAccordionOpen === row.key
                  return (
                    <div
                      key={row.key}
                      className={idx > 0 ? "border-t border-aa-border" : ""}>
                      <button
                        onClick={() =>
                          setMatchAccordionOpen((v) =>
                            v === row.key ? null : row.key
                          )
                        }
                        className="w-full flex items-center gap-aa-3 px-aa-4 py-aa-4 text-left">
                        <ChevronRight
                          className="w-[18px] h-[18px] text-aa-neutral-500 shrink-0 transition-transform duration-200"
                          style={{
                            transform: open ? "rotate(90deg)" : "rotate(0deg)"
                          }}
                        />
                        <row.Icon
                          className="w-4 h-4 shrink-0"
                          style={{ color: row.color }}
                        />
                        <span className="flex-1 text-[15px] font-semibold text-aa-text-primary">
                          {row.label}
                        </span>
                        <span className="text-[13px] font-semibold text-aa-text-secondary tabular-nums">
                          {row.items.length}
                        </span>
                      </button>
                      {open && (
                        <ul className="flex flex-col gap-aa-3 px-aa-4 pb-aa-4 pl-[46px]">
                          {row.items.map((item, i) => (
                            <li
                              key={i}
                              className="flex gap-aa-2 text-[14px] leading-[1.45] text-aa-neutral-700">
                              <span
                                className="shrink-0 font-semibold"
                                style={{ color: row.color }}>
                                {row.marker}
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* Company About Card */}
          {(companyInfo || companyInfoLoading) && (
            <div className="bg-aa-surface rounded-aa-lg border border-aa-border px-aa-4 py-aa-4 flex flex-col gap-aa-3">
              {companyInfoLoading ? (
                <div className="flex items-center gap-aa-2 animate-pulse">
                  <Building2 className="w-4 h-4 text-aa-neutral-500" />
                  <span className="text-[14px] font-semibold text-aa-text-primary">
                    Researching {companyName}...
                  </span>
                </div>
              ) : (
                companyInfo && (
                  <>
                    <div className="flex items-center gap-aa-2">
                      <Building2 className="w-4 h-4 text-aa-neutral-500" />
                      <h3 className="text-[14px] font-semibold text-aa-text-primary">
                        About {companyName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-aa-2">
                      <span className="inline-flex items-center gap-[6px] rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[10px] py-[6px] text-[11px] text-aa-text-secondary">
                        <Building2 className="w-3 h-3 text-aa-neutral-400" />
                        {companyInfo.industry}
                      </span>
                      <span className="inline-flex items-center gap-[6px] rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[10px] py-[6px] text-[11px] text-aa-text-secondary">
                        <Users className="w-3 h-3 text-aa-neutral-400" />
                        {companyInfo.size}
                      </span>
                    </div>

                    {companyInfo.description && (
                      <p className="text-[12px] text-aa-neutral-600 leading-[1.6]">
                        {companyInfo.description}
                      </p>
                    )}

                    {companyInfo.notableProjects.length > 0 && (
                      <div>
                        <button
                          onClick={() => setProjectsExpanded((v) => !v)}
                          className="flex items-center gap-1 text-[12px] font-semibold text-aa-text-link">
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
                          <ul className="list-disc list-inside text-[12px] text-aa-neutral-600 space-y-1 pl-1 mt-2">
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
                            className="inline-flex items-center gap-1 rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[10px] py-[6px] text-[11px]">
                            <span className="text-aa-text-secondary">Glassdoor</span>
                            <span
                              className={
                                companyInfo.ratings.glassdoor >= 3.5
                                  ? "text-aa-success-strong"
                                  : "text-aa-error-strong"
                              }>
                              {companyInfo.ratings.glassdoor}★
                            </span>
                          </span>
                        )}
                        {companyInfo.ratings.indeed && (
                          <span
                            className="inline-flex items-center gap-1 rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[10px] py-[6px] text-[11px]">
                            <span className="text-aa-text-secondary">Indeed</span>
                            <span
                              className={
                                companyInfo.ratings.indeed >= 3.5
                                  ? "text-aa-success-strong"
                                  : "text-aa-error-strong"
                              }>
                              {companyInfo.ratings.indeed}★
                            </span>
                          </span>
                        )}
                        {companyInfo.ratings.teamlyzer && (
                          <span
                            className="inline-flex items-center gap-1 rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[10px] py-[6px] text-[11px]">
                            <span className="text-aa-text-secondary">Teamlyzer</span>
                            <span
                              className={
                                companyInfo.ratings.teamlyzer >= 3.5
                                  ? "text-aa-success-strong"
                                  : "text-aa-error-strong"
                              }>
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

            {/* Triage — "What next?" — part of the same collapsing group as
                the report above it (same visibility condition), so they
                hide as one unit with no extra gap between them. */}
            <div className="bg-aa-surface-subtle rounded-aa-lg p-aa-6 flex flex-col gap-aa-4">
              <span className="text-[13px] font-semibold text-aa-text-primary">
                What next?
              </span>
              <div className="flex flex-col gap-aa-3">
                <div className="flex gap-aa-3">
                  <button
                    onClick={() => setTriageDecision("apply")}
                    className="flex-1 flex items-center justify-center gap-aa-2 py-[12px] rounded-aa-md bg-aa-primary text-aa-text-on-primary text-[14px] font-semibold hover:bg-aa-primary-hover transition-colors">
                    <Sparkles size={16} className="shrink-0" />
                    Apply
                  </button>
                  <button
                    onClick={() => openSaveForm()}
                    className="flex-1 flex items-center justify-center py-[12px] rounded-aa-md bg-aa-surface border border-aa-primary text-aa-primary text-[14px] font-semibold hover:bg-aa-primary-soft transition-colors">
                    Save for later
                  </button>
                </div>
                <button
                  onClick={() => closeSidePanel()}
                  className="self-center px-aa-3 py-aa-2 text-[13px] font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors">
                  Not a fit
                </button>
              </div>
            </div>
          </div>

          {/* Everything below fades/shrinks in once "Apply" is chosen in the
              triage above, and collapses back out on "Back to report" — the
              same transition as the report content above, run in reverse.
              "Save for later" and "Not a fit" navigate away immediately
              instead of revealing more of this screen.

              Sits with the report block above inside one gap-0 wrapper (next
              edit) so only one of the two ever contributes real height —
              no doubled-up gap between two flex siblings that are never
              both visible at once. */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              triageDecision === "apply"
                ? "max-h-[3000px] opacity-100 translate-y-0"
                : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
            }`}>
            <div className="flex flex-col gap-aa-6">
              <BackLink
                label="Back to report"
                onClick={() => setTriageDecision(null)}
              />

              {/* Strengthen this application (step 2a) — turns the gaps and
                  improvements above into actionable input, then generates.
                  Stays visible after generating too, so the user can keep
                  addressing gaps and regenerate. */}
              <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 flex flex-col gap-aa-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold tracking-[0.6px] text-aa-text-secondary uppercase">
                    Before you generate
                  </span>
                  <span className="text-[15px] font-semibold text-aa-text-primary">
                    Strengthen this application
                  </span>
                  <p className="text-[13px] text-aa-text-secondary leading-[1.5]">
                    Close a gap or two below and we'll fold it into your
                    tailored CV and cover letter.
                  </p>
                </div>

                {(result.match.weaknesses?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-aa-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-aa-text-primary">
                        Skill gaps
                      </span>
                      <span className="text-[12px] font-semibold text-aa-text-secondary tabular-nums">
                        {Object.keys(addedGapSkills).length} of{" "}
                        {result.match.weaknesses.length} addressed
                      </span>
                    </div>
                    <div className="bg-aa-surface-subtle rounded-aa-lg border border-aa-border flex flex-col">
                      {result.match.weaknesses.map((text, i) => (
                        <div
                          key={i}
                          className={i > 0 ? "border-t border-aa-border" : ""}>
                          <GapRow
                            text={text}
                            added={addedGapSkills[i] ?? null}
                            onAdd={(name, years) =>
                              handleAddGapSkill(i, name, years)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Generate CTA — sits below the "Before you generate" card
                  rather than inside it, and stays available after documents
                  exist so the user can regenerate with fresh answers above. */}
              <div className="flex flex-col gap-aa-2">
                {docsLoading ? (
                  <div className="flex flex-col gap-aa-2">
                    <div className="w-full bg-aa-neutral-200 h-[10px] rounded-aa-pill overflow-hidden">
                      <div
                        className="h-[10px] bg-aa-primary transition-all duration-300 ease-out"
                        style={{ width: `${docsProgress}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-aa-text-secondary text-center">
                      Generating your documents… this may take a minute
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateDocuments}
                    className="flex items-center justify-center gap-aa-2 py-[12px] rounded-aa-md bg-aa-primary text-aa-text-on-primary text-[14px] font-semibold hover:bg-aa-primary-hover transition-colors">
                    <Sparkles size={16} />
                    {docs ? "Regenerate CV + cover letter" : "Generate CV + cover letter"}
                  </button>
                )}
                {docsError && (
                  <p className="text-[13px] text-aa-error-strong">
                    {docsError}
                  </p>
                )}
              </div>

              {/* Documents card — presented below the Generate button once
                  the documents exist. Preview opens a standalone window,
                  centered on screen — a chrome.sidePanel can't paint an
                  overlay outside its own docked strip. MD/PDF downloads
                  happen from inside that preview window. */}
              {docs && (
                <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
                  {(
                    [
                      { tab: "resume", label: "Resume" },
                      { tab: "coverLetter", label: "Cover letter" }
                    ] as const
                  ).map((file, i) => (
                    <div
                      key={file.label}
                      className={`flex items-center justify-between px-aa-4 py-aa-4 ${
                        i === 0 ? "border-b border-aa-border" : ""
                      }`}>
                      <span className="text-[14px] font-semibold text-aa-text-primary">
                        {file.label}
                      </span>
                      <button
                        onClick={() => handleOpenDocumentPreview(file.tab, docs)}
                        className="flex items-center gap-[6px] rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[14px] py-2 text-[11px] font-semibold text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
                        <Eye size={14} />
                        Preview
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {previewError && (
                <p className="text-[13px] text-aa-error-strong">
                  {previewError}
                </p>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    )
  }

  // Save form screen
  if (view === "saveForm") {
    const sfLabel =
      "block text-[12px] font-semibold text-aa-text-secondary mb-1.5"
    const sfInput =
      "w-full px-3.5 py-2.5 bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm placeholder:text-aa-neutral-400 focus:outline-none focus:border-aa-primary transition-colors"
    return (
      <div className="min-h-screen bg-aa-surface-subtle flex flex-col font-aa text-aa-text-primary">
        {/* Top Bar */}
        <div className="h-[60px] shrink-0 bg-aa-surface px-6 flex items-center justify-between border-b border-aa-border">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[17px] font-bold tracking-[-0.3px] text-aa-text-primary leading-none">
              {editingApplication ? "Edit application" : "Save application"}
            </h1>
            <p className="text-[12px] text-aa-text-secondary leading-none">
              Keep your pipeline up to date
            </p>
          </div>
          <button
            onClick={() => setView("success")}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-aa-md bg-aa-neutral-100 text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-6 py-8 overflow-auto flex justify-center">
          <div className="w-full max-w-lg space-y-5">
            {/* Fields */}
            <div className="space-y-4">
              {/* Company */}
              <div>
                <label className={sfLabel}>Company *</label>
                <input
                  type="text"
                  value={saveFormData.company}
                  onChange={(e) =>
                    setSaveFormData((d) => ({ ...d, company: e.target.value }))
                  }
                  className={sfInput}
                />
              </div>

              {/* Job Title */}
              <div>
                <label className={sfLabel}>Job title *</label>
                <input
                  type="text"
                  value={saveFormData.jobTitle}
                  onChange={(e) =>
                    setSaveFormData((d) => ({ ...d, jobTitle: e.target.value }))
                  }
                  className={sfInput}
                />
              </div>

              {/* Status + Date (2 columns) */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={sfLabel}>Status</label>
                  <select
                    value={saveFormData.status}
                    onChange={(e) =>
                      setSaveFormData((d) => ({
                        ...d,
                        status: e.target.value as ApplicationStatus
                      }))
                    }
                    className={sfInput}>
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={sfLabel}>Date applied *</label>
                  <input
                    type="date"
                    value={saveFormData.date}
                    onChange={(e) =>
                      setSaveFormData((d) => ({ ...d, date: e.target.value }))
                    }
                    className={sfInput}
                  />
                </div>
              </div>

              {/* Job URL */}
              <div>
                <label className={sfLabel}>Job posting URL</label>
                <input
                  type="url"
                  value={saveFormData.jobUrl}
                  onChange={(e) =>
                    setSaveFormData((d) => ({ ...d, jobUrl: e.target.value }))
                  }
                  placeholder="https://…"
                  className={sfInput}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-aa-border" />

            {/* Tags */}
            <div>
              <label className={`${sfLabel} mb-2`}>Tags</label>
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
                      className={`px-3 py-1 rounded-aa-pill text-[11px] font-semibold border transition-colors ${
                        active
                          ? "bg-aa-primary text-aa-text-on-primary border-aa-primary"
                          : "border-aa-border text-aa-text-secondary hover:text-aa-text-primary hover:border-aa-neutral-400"
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-aa-pill text-[11px] text-aa-text-secondary border border-aa-border">
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          setSaveFormData((f) => ({
                            ...f,
                            tags: f.tags.filter((x) => x !== t)
                          }))
                        }
                        className="hover:text-aa-text-primary transition-colors leading-none">
                        ×
                      </button>
                    </span>
                  ))}
              </div>
              <input
                type="text"
                placeholder="Add custom tag, press Enter"
                className={sfInput}
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

            {/* Notes */}
            <div>
              <label className={sfLabel}>Notes</label>
              <textarea
                rows={3}
                value={saveFormData.notes}
                onChange={(e) =>
                  setSaveFormData((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Interview notes, contacts, reminders…"
                className={`${sfInput} resize-none`}
              />
            </div>

            {/* Save docs checkbox (only from success flow) */}
            {result?.resumeContent && (
              <label className="flex items-center gap-2.5 text-[13px] text-aa-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveDocs}
                  onChange={(e) => setSaveDocs(e.target.checked)}
                  className="w-4 h-4 accent-aa-primary"
                />
                Save resume and cover letter
              </label>
            )}

            {saveFormError && (
              <p className="text-sm text-aa-error-strong">{saveFormError}</p>
            )}

            {/* Generate documents — for applications saved "for later"
                without a CV/cover letter yet, but with the job description
                persisted at save time */}
            {editingApplication?.jobDescription &&
              !editingApplication.resumeContent && (
                <div className="border-t border-aa-border pt-5">
                  <button
                    onClick={generateDocumentsForApplication}
                    disabled={generatingDocsForApp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                             bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold
                             hover:bg-aa-primary-hover transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed">
                    {generatingDocsForApp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-aa-text-on-primary/30 border-t-aa-text-on-primary rounded-full animate-spin" />
                        <span>Generating documents…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Generate CV + cover letter</span>
                      </>
                    )}
                  </button>
                  {docsGenError && (
                    <p className="mt-2 text-sm text-aa-error-strong">
                      {docsGenError}
                    </p>
                  )}
                </div>
              )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveApplication}
                className="flex-1 px-4 py-2.5 bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold
                           hover:bg-aa-primary-hover transition-colors">
                Save
              </button>
              <button
                onClick={() => setView("success")}
                className="flex-1 px-4 py-2.5 border border-aa-border text-aa-text-secondary rounded-aa-md text-[13px] font-semibold
                           hover:text-aa-text-primary hover:border-aa-neutral-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form screen (default)
  const fieldLabel =
    "block text-[12px] font-semibold text-aa-text-secondary mb-1.5"
  const fieldInput =
    "w-full px-3.5 py-2.5 bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm placeholder:text-aa-neutral-400 focus:outline-none focus:border-aa-primary transition-colors"
  return (
    <div className="min-h-screen bg-aa-surface-subtle flex flex-col font-aa text-aa-text-primary">
      {/* Top Bar */}
      <div className="h-[60px] shrink-0 bg-aa-surface px-6 flex items-center justify-between border-b border-aa-border">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[17px] font-bold tracking-[-0.3px] text-aa-text-primary leading-none">
            Check your match
          </h1>
          <p className="text-[12px] text-aa-text-secondary leading-none">
            Confirm the job details, then analyze
          </p>
        </div>
        <button
          onClick={closeSidePanel}
          aria-label="Close"
          className="w-8 h-8 grid place-items-center rounded-aa-md bg-aa-neutral-100 text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-6 py-8 overflow-auto flex justify-center">
        <div className="w-full max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={fieldLabel}>Company name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Microsoft"
                required
                className={fieldInput}
              />
            </div>

            <div>
              <label className={fieldLabel}>Job title *</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                required
                className={fieldInput}
              />
            </div>

            {jobDescription && (
              <div>
                <label className={fieldLabel}>Job description (extracted)</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  className={`${fieldInput} resize-y`}
                />
              </div>
            )}

            <div>
              <label className={fieldLabel}>AI model</label>
              <div className="w-full px-3.5 py-2.5 bg-aa-surface border border-aa-border rounded-aa-md text-sm space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-aa-text-secondary">Match scoring</span>
                  <span className="font-medium text-aa-text-primary">
                    {routingLabels.scoring ?? "Set in Settings"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-aa-text-secondary">Document drafting</span>
                  <span className="font-medium text-aa-text-primary">
                    {routingLabels.drafting ?? "Set in Settings"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => chrome.runtime.openOptionsPage()}
                className="mt-1.5 text-[11px] font-semibold text-aa-primary hover:underline">
                Change in Settings → Model routing
              </button>
            </div>

            <div className="border-t border-aa-border pt-4">
              <p className="text-[12px] text-aa-text-secondary">
                Profile: {userProfile.skills?.length ?? 0} skills,{" "}
                {userProfile.workExperience?.length ?? 0} experiences,{" "}
                {userProfile.personalProjects?.length ?? 0} projects,{" "}
                {userProfile.languages?.length ?? 0} languages
              </p>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold hover:bg-aa-primary-hover transition-colors">
              Analyze match
            </button>
          </form>

          {status && (
            <p
              className={`mt-3 text-sm ${
                status.includes("failed") ||
                status.includes("error") ||
                status.includes("Error")
                  ? "text-aa-error-strong"
                  : "text-aa-primary"
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

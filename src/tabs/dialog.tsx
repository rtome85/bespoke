import { useEffect, useRef, useState } from "react"

import { Briefcase, Download, ExternalLink, Eye, FileText, Mail, Pencil, Trash2, X } from "lucide-react"

import { sendToBackground } from "@plasmohq/messaging"

import { AVAILABLE_MODELS } from "~types/config"
import {
  APPLICATION_STATUSES,
  DEFAULT_USER_PROFILE,
  type ApplicationStatus,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"
import { downloadMarkdownFile } from "~utils/documentFormatter"

import "../style.css"

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" }
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
  const initialView = new URLSearchParams(window.location.search).get("view") as View | null
  const [view, setView] = useState<View>(initialView ?? "form")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [selectedModel, setSelectedModel] = useState("gpt-oss:20b-cloud")
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * QUOTES.length)
  )
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [result, setResult] = useState<GenerationResult | null>(null)

  // Application tracker state
  const [savedApplications, setSavedApplications] = useState<SavedApplication[]>([])
  const [editingApplication, setEditingApplication] = useState<SavedApplication | null>(null)
  const [viewingApplication, setViewingApplication] = useState<SavedApplication | null>(null)
  const [pendingJobUrl, setPendingJobUrl] = useState("")
  const [saveFormData, setSaveFormData] = useState({
    company: "",
    jobTitle: "",
    status: "Saved" as ApplicationStatus,
    date: new Date().toISOString().split("T")[0],
    jobUrl: "",
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  // Track where the save form was opened from so Cancel goes back correctly
  const [saveFormOrigin, setSaveFormOrigin] = useState<"success" | "applicationsList">("success")
  const [saveDocs, setSaveDocs] = useState(true)
  const [saveFormError, setSaveFormError] = useState("")

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    chrome.storage.local.get(
      ["lastSelectedModel", "userProfile", "pendingJobData", "savedApplications"],
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
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current)
    }
  }, [loading])

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

  const openSaveForm = (origin: "success" | "applicationsList", app: SavedApplication | null = null) => {
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
      })
    } else {
      setSaveFormData({
        company: companyName,
        jobTitle: jobTitle,
        status: "Saved",
        date: new Date().toISOString().split("T")[0],
        jobUrl: pendingJobUrl,
      })
    }
    setView("saveForm")
  }

  const handleSaveApplication = () => {
    if (!saveFormData.company.trim() || !saveFormData.jobTitle.trim() || !saveFormData.date) {
      setSaveFormError("Company, job title, and date are required.")
      return
    }
    setSaveFormError("")

    const docs = !editingApplication && result && saveDocs
      ? {
        resumeContent: result.resumeContent,
        resumeFilename: result.resumeFilename,
        coverLetterContent: result.coverLetterContent,
        coverLetterFilename: result.coverLetterFilename,
      }
      : {}

    const updated: SavedApplication[] = editingApplication
      ? savedApplications.map((a) =>
        a.id === editingApplication.id
          ? { ...a, ...saveFormData, jobUrl: saveFormData.jobUrl || undefined }
          : a
      )
      : [
        ...savedApplications,
        {
          ...saveFormData,
          jobUrl: saveFormData.jobUrl || undefined,
          ...docs,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
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
          <h2 className="text-xl font-bold text-gray-900 mb-1">Crafting your documents…</h2>
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
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">Documents Ready!</h2>
          </div>

          {/* Match score card */}
          <div className="bg-gray-50 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Match Score</span>
              <span className={`text-2xl font-bold ${pct >= 70 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"
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
              <p className="text-xs text-gray-600 leading-relaxed">{result.match.summary}</p>
            )}
          </div>

          {/* Strengths / Weaknesses / Improvements */}
          {((result.match.strengths?.length ?? 0) > 0 || (result.match.weaknesses?.length ?? 0) > 0 || (result.match.improvements?.length ?? 0) > 0) && (
            <div className="space-y-3 mb-5">
              {(result.match.strengths?.length ?? 0) > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Strengths</p>
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
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Weaknesses</p>
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

              {(result.match.improvements?.length ?? 0) > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Improvements</p>
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

          {/* Download buttons */}
          <div className="space-y-3">
            <button
              onClick={() =>
                downloadMarkdownFile(result.resumeFilename, result.resumeContent)
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-3
                         bg-gradient-to-r from-purple-500 to-purple-600
                         text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
              <span>↓</span>
              <span>Download Resume</span>
            </button>

            <button
              onClick={() =>
                downloadMarkdownFile(result.coverLetterFilename, result.coverLetterContent)
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-3
                         bg-gradient-to-r from-indigo-500 to-indigo-600
                         text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
              <span>↓</span>
              <span>Download Cover Letter</span>
            </button>
          </div>

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
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingApplication ? "Edit Application" : "Save Application"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Track your job application</p>
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
                    status: e.target.value as ApplicationStatus,
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-100 p-4">
        {/* Detail modal overlay */}
        {viewingApplication && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Application Details</h3>
                <button
                  onClick={() => setViewingApplication(null)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</dt>
                  <dd className="text-sm text-gray-900 mt-0.5">{viewingApplication.company}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job Title</dt>
                  <dd className="text-sm text-gray-900 mt-0.5">{viewingApplication.jobTitle}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</dt>
                  <dd className="mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(viewingApplication.status)}`}>
                      {viewingApplication.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date Applied</dt>
                  <dd className="text-sm text-gray-900 mt-0.5">{viewingApplication.date}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saved At</dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {new Date(viewingApplication.createdAt).toLocaleString()}
                  </dd>
                </div>
                {viewingApplication.jobUrl && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job Posting</dt>
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
              {(viewingApplication.resumeContent || viewingApplication.coverLetterContent) && (
                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Documents</p>
                  {viewingApplication.resumeContent && viewingApplication.resumeFilename && (
                    <button
                      onClick={() => downloadMarkdownFile(viewingApplication.resumeFilename, viewingApplication.resumeContent)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                                 bg-gradient-to-r from-purple-500 to-purple-600
                                 text-white text-sm rounded-lg hover:opacity-90 transition-opacity font-medium">
                      <Download size={14} />
                      <span>Download CV</span>
                    </button>
                  )}
                  {viewingApplication.coverLetterContent && viewingApplication.coverLetterFilename && (
                    <button
                      onClick={() => downloadMarkdownFile(viewingApplication.coverLetterFilename, viewingApplication.coverLetterContent)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                                 bg-gradient-to-r from-indigo-500 to-indigo-600
                                 text-white text-sm rounded-lg hover:opacity-90 transition-opacity font-medium">
                      <Download size={14} />
                      <span>Download Cover Letter</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6 pt-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Saved Applications</h2>
              <p className="text-sm text-gray-500 mt-0.5">{savedApplications.length} application{savedApplications.length !== 1 ? "s" : ""}</p>
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

          {savedApplications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <Briefcase size={36} className="text-gray-200" />
              </div>
              <p className="text-gray-600 text-sm font-medium">No applications saved yet</p>
              <p className="text-gray-400 text-xs mt-1">Save your first application after generating documents.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {savedApplications.map((app, idx) => (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-50 ${idx % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {app.company}
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open job posting"
                              className="text-gray-300 hover:text-purple-500 transition-colors shrink-0"
                              onClick={(e) => e.stopPropagation()}>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{app.jobTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{app.date}</td>
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
                            onClick={() => openSaveForm("applicationsList", app)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          {app.resumeContent && app.resumeFilename && (
                            <button
                              title="Download CV"
                              onClick={() => downloadMarkdownFile(app.resumeFilename, app.resumeContent)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                              <FileText size={14} />
                            </button>
                          )}
                          {app.coverLetterContent && app.coverLetterFilename && (
                            <button
                              title="Download Cover Letter"
                              onClick={() => downloadMarkdownFile(app.coverLetterFilename, app.coverLetterContent)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                              <Mail size={14} />
                            </button>
                          )}
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
            <h1 className="text-xl font-bold text-gray-900">Generate Documents</h1>
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
                  {model.name}{model.recommended ? " (Recommended)" : ""} — {model.description}
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

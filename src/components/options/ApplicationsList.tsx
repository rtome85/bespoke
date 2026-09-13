import { useEffect, useMemo, useRef, useState } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import {
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Search,
  Sparkles,
  Trash2,
  X
} from "lucide-react"

import { BackLink } from "~components/common/BackLink"
import { DocumentGenerationControls } from "~components/dialog/DocumentGenerationControls"
import { GeneratedDocumentsCard } from "~components/dialog/GeneratedDocumentsCard"
import { StrengthenApplication } from "~components/dialog/StrengthenApplication"
import { useDocumentGenerationProgress } from "~hooks/dialog/useSimulatedProgress"
import { STORAGE_KEYS } from "~storage/keys"
import type { AddedGapSkills } from "~types/dialog"
import type {
  DocumentPreviewDraft,
  DocumentPreviewTab
} from "~types/documentPreview"
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"

interface Props {
  applications: SavedApplication[]
  onUpdate: (id: string, patch: Partial<SavedApplication>) => void
  onDelete: (id: string) => void
}

const STATUS_PILL: Record<ApplicationStatus, string> = {
  Saved: "bg-aa-neutral-100 text-aa-text-secondary",
  Applied: "bg-aa-primary-soft text-aa-primary",
  Interviewing: "bg-aa-warning-soft text-aa-warning-strong",
  Offer: "bg-aa-success-soft text-aa-success-strong",
  Reject: "bg-aa-error-soft text-aa-error-strong"
}

function relTime(iso?: string): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  if (isNaN(t)) return "—"
  const d = Math.floor((Date.now() - t) / 86_400_000)
  if (d <= 0) return "today"
  if (d === 1) return "yesterday"
  if (d < 30) return `${d}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

const th =
  "text-[10px] font-semibold uppercase tracking-wider text-aa-text-secondary"

export function ApplicationsList({
  applications,
  onUpdate,
  onDelete
}: Props) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">(
    "All"
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState("")
  const [showStrengthen, setShowStrengthen] = useState(false)
  const [addedGapSkills, setAddedGapSkills] = useState<AddedGapSkills>({})
  const [previewError, setPreviewError] = useState("")
  const [showSaved, setShowSaved] = useState(false)
  const { progress: genProgress, setProgress: setGenProgress } =
    useDocumentGenerationProgress(generating)
  const applicationPanelRef = useRef<HTMLDivElement>(null)
  const strengthenPanelRef = useRef<HTMLDivElement>(null)

  // React 18's DOM property config doesn't recognize `inert`, so passing it
  // as a JSX prop gets silently dropped for host elements regardless of
  // true/false — set the underlying DOM property directly instead. Re-run on
  // openId too, since the drawer (and these refs) remount on every open.
  useEffect(() => {
    if (applicationPanelRef.current) {
      applicationPanelRef.current.inert = showStrengthen
    }
    if (strengthenPanelRef.current) {
      strengthenPanelRef.current.inert = !showStrengthen
    }
  }, [showStrengthen, openId])

  useEffect(() => {
    setGenerating(false)
    setGenError("")
    setShowStrengthen(false)
    setAddedGapSkills({})
    setPreviewError("")
    setShowSaved(false)
  }, [openId])

  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashSaved = () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    setShowSaved(true)
    savedTimeoutRef.current = setTimeout(() => {
      savedTimeoutRef.current = null
      setShowSaved(false)
    }, 3000)
  }

  useEffect(
    () => () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    },
    []
  )

  // Slide the drawer in on the frame after it mounts, so the transition has
  // an off-screen starting point to animate from instead of snapping open.
  useEffect(() => {
    if (!openId) return
    const raf = requestAnimationFrame(() => setDrawerVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [openId])

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  // Opening a different application must cancel any close still in flight —
  // otherwise its delayed setOpenId(null) fires later and closes the newly
  // opened drawer out from under the user.
  useEffect(() => {
    if (openId) clearCloseTimeout()
  }, [openId])

  useEffect(() => clearCloseTimeout, [])

  const closeDrawer = () => {
    clearCloseTimeout()
    setDrawerVisible(false)
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null
      setOpenId(null)
    }, 300)
  }

  const presentStatuses = useMemo(
    () =>
      APPLICATION_STATUSES.filter((s) =>
        applications.some((a) => a.status === s)
      ),
    [applications]
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications
      .filter((a) => statusFilter === "All" || a.status === statusFilter)
      .filter(
        (a) =>
          !q ||
          a.company.toLowerCase().includes(q) ||
          a.jobTitle.toLowerCase().includes(q) ||
          (a.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
      .sort(
        (a, b) =>
          new Date(b.statusUpdatedAt ?? b.createdAt).getTime() -
          new Date(a.statusUpdatedAt ?? a.createdAt).getTime()
      )
  }, [applications, query, statusFilter])

  const open = openId
    ? applications.find((a) => a.id === openId) ?? null
    : null

  // "Saved for later" applications keep the job description but no documents —
  // let the user generate them here without reopening the side panel.
  const canGenerate =
    !!open?.jobDescription && !open.resumeContent && !open.coverLetterContent

  const generateDocuments = async () => {
    if (!open?.jobDescription) return
    setGenerating(true)
    setGenError("")
    try {
      const { userProfile } = (await chrome.storage.local.get("userProfile")) as {
        userProfile?: UserProfile
      }
      const response = await sendToBackground({
        name: "generateDocuments",
        body: {
          companyName: open.company,
          jobTitle: open.jobTitle,
          userProfile,
          jobDescription: open.jobDescription
        }
      })
      if (response?.success) {
        setGenProgress(100)
        setTimeout(() => {
          onUpdate(open.id, {
            resumeContent: response.data.resumeContent,
            resumeFilename: response.data.resumeFilename,
            coverLetterContent: response.data.coverLetterContent,
            coverLetterFilename: response.data.coverLetterFilename
          })
          setGenerating(false)
        }, 400)
      } else {
        setGenError(response?.message || "Generation failed. Please try again.")
        setGenerating(false)
      }
    } catch (error) {
      setGenError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
      setGenerating(false)
    }
  }

  const handleAddGapSkill = async (index: number, name: string, years: number) => {
    setAddedGapSkills((current) => ({ ...current, [index]: { name, years } }))
    const { userProfile } = (await chrome.storage.local.get("userProfile")) as {
      userProfile?: UserProfile
    }
    if (
      !userProfile ||
      userProfile.skills.some(
        (skill) => skill.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return
    }
    await chrome.storage.local.set({
      userProfile: {
        ...userProfile,
        skills: [
          ...userProfile.skills,
          { id: crypto.randomUUID(), name, yearsOfExperience: years }
        ]
      }
    })
  }

  const documents =
    open?.resumeContent &&
    open.resumeFilename &&
    open.coverLetterContent &&
    open.coverLetterFilename
      ? {
          resumeContent: open.resumeContent,
          resumeFilename: open.resumeFilename,
          coverLetterContent: open.coverLetterContent,
          coverLetterFilename: open.coverLetterFilename
        }
      : null

  const openDocumentPreview = async (
    tab: DocumentPreviewTab,
    docs: NonNullable<typeof documents>
  ) => {
    setPreviewError("")
    try {
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
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Could not open the preview window."
      )
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-[22px] font-bold tracking-[-0.4px] text-aa-text-primary mb-4">
        Applications
      </h1>

      {applications.length === 0 ? (
        <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 py-16 text-center">
          <p className="text-[14px] font-semibold text-aa-text-primary">
            No tracked applications yet
          </p>
          <p className="text-[13px] text-aa-text-secondary mt-1">
            Run a match from a job posting and save it.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-aa-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company, role, tag"
                className="w-64 pl-8 pr-3 py-[7px] bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...presentStatuses] as const).map((s) => {
                const on = statusFilter === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-[6px] rounded-aa-pill text-[11px] font-semibold transition-colors ${
                      on
                        ? "bg-aa-primary text-aa-text-on-primary"
                        : "bg-aa-surface border border-aa-border text-aa-text-secondary hover:text-aa-text-primary"
                    }`}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-aa-border bg-aa-neutral-50">
              <span className={`${th} flex-1`}>Company · Role</span>
              <span className={`${th} w-16 text-right`}>Match</span>
              <span className={`${th} w-40`}>Status</span>
              <span className={`${th} w-24`}>Updated</span>
              <span className="w-4" />
            </div>

            {rows.length === 0 ? (
              <p className="text-[13px] text-aa-text-secondary text-center py-8">
                Nothing matches those filters.
              </p>
            ) : (
              rows.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setOpenId(a.id)
                    setConfirmDelete(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-aa-border last:border-0 text-left hover:bg-aa-neutral-50 transition-colors">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-aa-text-primary truncate">
                      {a.company}
                    </span>
                    <span className="block text-[12px] text-aa-text-secondary truncate">
                      {a.jobTitle}
                    </span>
                  </span>
                  <span
                    className={`w-16 text-right text-[12px] font-semibold tabular-nums ${
                      a.matchPercentage == null
                        ? "text-aa-neutral-400"
                        : "text-aa-text-primary"
                    }`}>
                    {a.matchPercentage == null ? "—" : `${a.matchPercentage}%`}
                  </span>
                  <span className="w-40">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-aa-pill text-[10px] font-bold uppercase tracking-wide ${STATUS_PILL[a.status]}`}>
                      {a.status}
                    </span>
                  </span>
                  <span className="w-24 text-[12px] text-aa-text-secondary">
                    {relTime(a.statusUpdatedAt ?? a.createdAt)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-aa-neutral-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* Detail drawer */}
      {open && (
        <div
          className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ease-in-out ${
            drawerVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeDrawer}>
          <div
            className={`absolute inset-y-0 right-0 w-[420px] max-w-[92vw] bg-aa-surface border-l border-aa-border shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
              drawerVisible ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 bg-aa-surface border-b border-aa-border px-5 h-14 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-aa-text-primary">
                Application
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 grid place-items-center rounded-aa-md text-aa-text-secondary hover:bg-aa-neutral-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
              <div className="bg-aa-surface-brand-soft rounded-aa-lg p-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[26px] font-extrabold tracking-tight text-aa-text-primary">
                    {open.company}
                  </h2>
                  <p className="text-[14px] text-aa-text-secondary mt-1">
                    {open.jobTitle}
                  </p>
                  {open.jobUrl && (
                    <a
                      href={open.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-semibold text-aa-primary hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Job posting
                    </a>
                  )}
                </div>
                {open.matchPercentage != null && (
                  <div className="shrink-0 flex flex-col items-center justify-center w-[84px] h-[84px] rounded-full border-[3px] border-aa-success-strong">
                    <span className="text-[22px] font-extrabold text-aa-success-strong leading-none">
                      {open.matchPercentage}%
                    </span>
                    <span className="text-[12px] text-aa-text-secondary mt-1">
                      Match
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <div
                  ref={applicationPanelRef}
                  className={`flex flex-col gap-5 overflow-hidden transition-all duration-500 ease-in-out ${
                    showStrengthen
                      ? "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                      : "max-h-[3000px] opacity-100 translate-y-0"
                  }`}
                  aria-hidden={showStrengthen}>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5">
                      Status
                    </label>
                    <select
                      value={open.status}
                      onChange={(e) => {
                        onUpdate(open.id, {
                          status: e.target.value as ApplicationStatus
                        })
                        flashSaved()
                      }}
                      className="w-full px-3 py-[9px] bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors">
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-aa-text-secondary mt-1">
                      Last change{" "}
                      {relTime(open.statusUpdatedAt ?? open.createdAt)}
                    </p>
                  </div>

                  {(open.tags ?? []).length > 0 && (
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {open.tags!.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-aa-pill bg-aa-neutral-100 text-[11px] text-aa-text-secondary">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5">
                      Notes
                    </label>
                    <textarea
                      value={open.notes ?? ""}
                      onChange={(e) => {
                        onUpdate(open.id, { notes: e.target.value })
                        flashSaved()
                      }}
                      rows={4}
                      placeholder="Recruiter name, next step, prep reminders…"
                      className="w-full px-3 py-2 bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors resize-y"
                    />
                  </div>

                  {open.matchSummary && (
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5">
                        Match summary
                      </span>
                      <p className="text-[13px] text-aa-neutral-700 leading-relaxed">
                        {open.matchSummary}
                      </p>
                    </div>
                  )}

                  {(open.resumeContent || open.coverLetterContent || canGenerate) && (
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5">
                        Documents
                      </span>

                      {documents ? (
                        <>
                          <div className="overflow-hidden">
                            {(
                              [
                                { tab: "resume", label: documents.resumeFilename },
                                {
                                  tab: "coverLetter",
                                  label: documents.coverLetterFilename
                                }
                              ] as const
                            ).map((file, index) => (
                              <button
                                key={file.tab}
                                type="button"
                                onClick={() =>
                                  openDocumentPreview(file.tab, documents)
                                }
                                className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-aa-neutral-50 transition-colors">
                                <FileText className="w-[15px] h-[15px] text-aa-neutral-500 shrink-0" />
                                <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-aa-text-primary">
                                  {file.label}
                                </span>
                                <Eye className="w-[15px] h-[15px] text-aa-neutral-400 shrink-0" />
                              </button>
                            ))}
                          </div>
                          {previewError && (
                            <p className="text-[13px] text-aa-error-strong mt-2">
                              {previewError}
                            </p>
                          )}
                          {open.jobDescription && (
                            <button
                              type="button"
                              onClick={() => setShowStrengthen(true)}
                              className="w-full mt-2 rounded-aa-md bg-aa-primary py-[9px] text-[12px] font-semibold text-aa-text-on-primary hover:bg-aa-primary-hover transition-colors">
                              Regenerate
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[12px] text-aa-text-secondary">
                            Saved for later — no CV or cover letter yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowStrengthen(true)}
                            className="inline-flex items-center gap-2 rounded-aa-md bg-aa-primary px-3.5 py-2 text-[12px] font-semibold text-aa-text-on-primary hover:bg-aa-primary-hover transition-colors">
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate CV + cover letter
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  ref={strengthenPanelRef}
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    showStrengthen
                      ? "max-h-[3000px] opacity-100 translate-y-0"
                      : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                  }`}
                  aria-hidden={!showStrengthen}>
                  <div className="flex flex-col gap-5">
                    <BackLink
                      label="Back"
                      onClick={() => setShowStrengthen(false)}
                    />
                    <StrengthenApplication
                      weaknesses={open.matchWeaknesses ?? []}
                      addedGapSkills={addedGapSkills}
                      onAddGapSkill={handleAddGapSkill}
                    />
                    <DocumentGenerationControls
                      isLoading={generating}
                      progress={genProgress}
                      error={genError}
                      hasDocuments={Boolean(documents)}
                      onGenerate={generateDocuments}
                    />
                    {documents && (
                      <GeneratedDocumentsCard
                        documents={documents}
                        previewError={previewError}
                        onPreview={openDocumentPreview}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 bg-aa-surface border-t border-aa-border px-5 py-3 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-aa-success-strong transition-opacity duration-300 ${
                  showSaved ? "opacity-100" : "opacity-0"
                }`}>
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
              {confirmDelete ? (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(open.id)
                      closeDrawer()
                    }}
                    className="text-[12px] font-semibold text-aa-error-strong hover:underline">
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[12px] font-semibold text-aa-text-secondary hover:underline">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-aa-text-secondary hover:text-aa-error-strong transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete application
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

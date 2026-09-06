import { useEffect, useMemo, useState } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import {
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Sparkles,
  Star,
  X
} from "lucide-react"

import { downloadMarkdownAsPdf } from "~lib/pdf"
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"
import { downloadMarkdownFile } from "~utils/documentFormatter"

interface Props {
  applications: SavedApplication[]
  onUpdate: (id: string, patch: Partial<SavedApplication>) => void
  onDelete: (id: string) => void
  onTrackNew: () => void
  onOpenSidePanel: () => void
}

const STATUS_PILL: Record<ApplicationStatus, string> = {
  Saved: "bg-aa-neutral-100 text-aa-text-secondary",
  Applied: "bg-aa-primary-soft text-aa-primary",
  "HR Interview": "bg-aa-warning-soft text-aa-warning-strong",
  "1st Technical Interview": "bg-aa-warning-soft text-aa-warning-strong",
  "2nd Technical Interview": "bg-aa-warning-soft text-aa-warning-strong",
  "Final Interview": "bg-aa-warning-soft text-aa-warning-strong",
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
  onDelete,
  onTrackNew,
  onOpenSidePanel
}: Props) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">(
    "All"
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState("")

  useEffect(() => {
    setGenerating(false)
    setGenError("")
  }, [openId])

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
        onUpdate(open.id, {
          resumeContent: response.data.resumeContent,
          resumeFilename: response.data.resumeFilename,
          coverLetterContent: response.data.coverLetterContent,
          coverLetterFilename: response.data.coverLetterFilename
        })
      } else {
        setGenError(response?.message || "Generation failed. Please try again.")
      }
    } catch (error) {
      setGenError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.4px] text-aa-text-primary">
          Applications
        </h1>
        <button
          type="button"
          onClick={onTrackNew}
          className="px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer hover:bg-aa-primary-hover transition-colors">
          Track application
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 py-16 text-center">
          <p className="text-[14px] font-semibold text-aa-text-primary">
            No tracked applications yet
          </p>
          <p className="text-[13px] text-aa-text-secondary mt-1">
            Run a match from a job posting and save it, or add one by hand with
            Track application.
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
                    <span className="flex items-center gap-1.5">
                      {a.isFavorite && (
                        <Star
                          className="w-3 h-3 text-aa-primary shrink-0"
                          fill="currentColor"
                        />
                      )}
                      <span className="text-[13px] font-semibold text-aa-text-primary truncate">
                        {a.company}
                      </span>
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
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpenId(null)}>
          <div
            className="absolute inset-y-0 right-0 w-[420px] max-w-[92vw] bg-aa-surface border-l border-aa-border shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-aa-surface border-b border-aa-border px-5 h-14 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-aa-text-primary">
                Application
              </span>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="w-8 h-8 grid place-items-center rounded-aa-md text-aa-text-secondary hover:bg-aa-neutral-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-aa-surface border border-aa-border rounded-aa-lg p-4">
                <div className="flex items-center justify-between gap-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-[20px] font-bold text-aa-text-primary truncate">
                        {open.company}
                      </h2>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate(open.id, { isFavorite: !open.isFavorite })
                        }
                        aria-label="Toggle favourite"
                        className="shrink-0 grid place-items-center rounded-aa-sm hover:bg-aa-neutral-100 transition-colors">
                        <Star
                          className={`w-4 h-4 ${
                            open.isFavorite
                              ? "text-aa-primary"
                              : "text-aa-neutral-400"
                          }`}
                          fill={open.isFavorite ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    <p className="text-[13px] text-aa-text-secondary leading-relaxed">
                      {open.jobTitle}
                    </p>
                  </div>
                  {open.matchPercentage != null && (
                    <span className="shrink-0 grid place-items-center w-[52px] h-[52px] rounded-full bg-aa-primary-soft text-[13px] font-bold text-aa-primary">
                      {open.matchPercentage}%
                    </span>
                  )}
                </div>
                {open.jobUrl && (
                  <a
                    href={open.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2.5 text-[13px] font-semibold text-aa-primary hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Job posting
                  </a>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5">
                  Status
                </label>
                <select
                  value={open.status}
                  onChange={(e) =>
                    onUpdate(open.id, {
                      status: e.target.value as ApplicationStatus
                    })
                  }
                  className="w-full px-3 py-[9px] bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors">
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-aa-text-secondary mt-1">
                  Last change {relTime(open.statusUpdatedAt ?? open.createdAt)}
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
                  onChange={(e) => onUpdate(open.id, { notes: e.target.value })}
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

                  {open.resumeContent || open.coverLetterContent ? (
                    <div className="bg-aa-surface border border-aa-border rounded-aa-md overflow-hidden">
                      {[
                        {
                          label: "Resume",
                          filename: open.resumeFilename,
                          content: open.resumeContent
                        },
                        {
                          label: "Cover letter",
                          filename: open.coverLetterFilename,
                          content: open.coverLetterContent
                        }
                      ]
                        .filter((f) => f.content && f.filename)
                        .map((f, i) => (
                          <div
                            key={f.label}
                            className={`flex items-center justify-between px-3 py-2.5 ${
                              i === 0 ? "border-b border-aa-border" : ""
                            }`}>
                            <span className="text-[13px] font-semibold text-aa-text-primary">
                              {f.label}
                            </span>
                            <span className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadMarkdownFile(f.filename!, f.content!)
                                }
                                className="flex items-center gap-1.5 rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-3 py-1.5 text-[11px] font-semibold text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
                                <FileText className="w-3.5 h-3.5" />
                                MD
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await downloadMarkdownAsPdf(
                                      f.content!,
                                      f.filename!
                                    )
                                  } catch {
                                    alert(
                                      "Failed to generate PDF. Please try again."
                                    )
                                  }
                                }}
                                className="flex items-center gap-1.5 rounded-aa-sm bg-aa-primary px-3 py-1.5 text-[11px] font-semibold text-aa-text-on-primary hover:bg-aa-primary-hover transition-colors">
                                <Download className="w-3.5 h-3.5" />
                                PDF
                              </button>
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[12px] text-aa-text-secondary">
                        Saved for later — no CV or cover letter yet.
                      </p>
                      <button
                        type="button"
                        onClick={generateDocuments}
                        disabled={generating}
                        className="inline-flex items-center gap-2 rounded-aa-md bg-aa-primary px-3.5 py-2 text-[12px] font-semibold text-aa-text-on-primary hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
                        {generating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate CV + cover letter
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {genError && (
                    <p className="text-[12px] text-aa-error-strong mt-2">
                      {genError}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-aa-border">
                <button
                  type="button"
                  onClick={onOpenSidePanel}
                  className="mt-4 text-[12px] font-semibold text-aa-primary hover:underline">
                  Open in side panel
                </button>
                {confirmDelete ? (
                  <span className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(open.id)
                        setOpenId(null)
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
                    className="mt-4 text-[12px] font-semibold text-aa-text-secondary hover:text-aa-error-strong transition-colors">
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { SegmentedControl } from "~components/SegmentedControl"
import { hasOpenRound } from "~lib/interviews/selectors"
import { addRound, deleteRound, updateRound } from "~storage/savedApplications"
import type {
  InterviewRound,
  RoundFormat,
  RoundType,
  SavedApplication
} from "~types/userProfile"

export interface AddRoundEditRef {
  app: SavedApplication
  round: InterviewRound
}

interface Props {
  mode: "create" | "edit"
  apps: SavedApplication[]
  /** create mode — preselect this application */
  presetAppId?: string
  /** create mode — preselect the round type; `""` opens with no type chosen
   * (post-debrief "advance" flow: a Custom round has no canonical next). */
  presetType?: RoundType | ""
  /** edit mode — the round being edited */
  editRef?: AddRoundEditRef
  onClose: () => void
  onDone?: () => void
}

const label =
  "block text-[11px] font-semibold uppercase tracking-wider text-aa-text-secondary mb-1.5"
const field =
  "w-full px-3 py-[9px] bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors"

const TYPE_OPTIONS: { value: RoundType; label: string }[] = [
  { value: "HR", label: "HR Interview" },
  { value: "Technical", label: "Technical" },
  { value: "Final", label: "Final" },
  { value: "Custom", label: "Custom…" }
]

const FORMAT_OPTIONS: { value: RoundFormat; label: string }[] = [
  { value: "phone", label: "Phone call" },
  { value: "video", label: "Video" },
  { value: "onsite", label: "On-site" }
]

export function AddRoundDrawer({
  mode,
  apps,
  presetAppId,
  presetType,
  editRef,
  onClose,
  onDone
}: Props) {
  const editApp = editRef?.app
  const editRound = editRef?.round

  // Create mode: only applications that can receive a new round — not rejected,
  // and not already holding an open (undebriefed) round.
  const createApps = useMemo(
    () => apps.filter((a) => a.status !== "Reject" && !hasOpenRound(a)),
    [apps]
  )

  const [appId, setAppId] = useState(
    editApp?.id ?? presetAppId ?? createApps[0]?.id ?? ""
  )
  const [type, setType] = useState<RoundType | "">(
    editRound?.type ?? presetType ?? "HR"
  )
  const [customLabel, setCustomLabel] = useState(editRound?.customLabel ?? "")
  const [date, setDate] = useState(editRound?.date ?? "")
  const [time, setTime] = useState(editRound?.time ?? "")
  const [format, setFormat] = useState<RoundFormat>(
    editRound?.format ?? "video"
  )
  const [interviewers, setInterviewers] = useState(
    editRound?.interviewers ?? ""
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const selectedApp =
    editApp ?? createApps.find((a) => a.id === appId) ?? createApps[0]

  const willPromote =
    mode === "create" &&
    (selectedApp?.status === "Saved" || selectedApp?.status === "Applied")

  const nextNote = useMemo(() => {
    if (!selectedApp) return ""
    if (willPromote) {
      return `Saving moves ${selectedApp.company} to “Interviewing”. Change the status later from the application panel.`
    }
    return `This round is added to ${selectedApp.company}’s schedule.`
  }, [selectedApp, willPromote])

  const submit = async () => {
    if (!selectedApp) {
      setError("Pick an application first.")
      return
    }
    if (!type) {
      setError("Pick a round type.")
      return
    }
    setBusy(true)
    setError("")
    const payload = {
      type,
      customLabel:
        type === "Custom" ? customLabel.trim() || undefined : undefined,
      date: date || undefined,
      time: time || undefined,
      format,
      interviewers: interviewers.trim() || undefined
    }
    try {
      if (mode === "edit" && editApp && editRound) {
        await updateRound(editApp.id, editRound.id, payload)
      } else {
        await addRound(selectedApp.id, payload)
      }
      onDone?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!editApp || !editRound) return
    setBusy(true)
    try {
      await deleteRound(editApp.id, editRound.id)
      onDone?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the round.")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "edit" ? "Edit interview round" : "Add interview round"
        }
        className="absolute inset-y-0 right-0 w-[460px] max-w-[92vw] bg-aa-surface border-l border-aa-border shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 shrink-0 bg-aa-surface border-b border-aa-border px-5 h-14 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-aa-text-primary">
            {mode === "edit" ? "Edit interview round" : "Add interview round"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-aa-md text-aa-text-secondary hover:bg-aa-neutral-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === "create" && createApps.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-[13px] text-aa-text-secondary leading-relaxed">
              No application can take a new round right now. Every non-rejected
              application already has an open interview round — debrief it
              first.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <span className={label}>Application</span>
                {mode === "edit" ? (
                  <p className="text-[13px] font-semibold text-aa-text-primary">
                    {selectedApp
                      ? `${selectedApp.company} — ${selectedApp.jobTitle}`
                      : "—"}
                  </p>
                ) : (
                  <select
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className={field}>
                    {createApps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.company} — {a.jobTitle}
                      </option>
                    ))}
                  </select>
                )}
                {selectedApp && (
                  <p className="text-[11px] text-aa-text-secondary mt-1">
                    Currently “{selectedApp.status}”
                  </p>
                )}
              </div>

              <div>
                <label className={label}>Round type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RoundType)}
                  className={field}>
                  {type === "" && (
                    <option value="" disabled>
                      Choose a round type…
                    </option>
                  )}
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {type === "Custom" && (
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. System design, Hiring manager"
                    className={`${field} mt-2`}
                  />
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={label}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={field}
                  />
                </div>
                <div className="w-[140px]">
                  <label className={label}>Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={field}
                  />
                </div>
              </div>

              <div>
                <span className={label}>Format</span>
                <SegmentedControl<RoundFormat>
                  ariaLabel="Format"
                  options={FORMAT_OPTIONS}
                  value={format}
                  onChange={setFormat}
                />
              </div>

              <div>
                <label className={label}>Interviewer(s)</label>
                <input
                  type="text"
                  value={interviewers}
                  onChange={(e) => setInterviewers(e.target.value)}
                  placeholder="Jane R. — Engineering Manager"
                  className={field}
                />
                <p className="text-[11px] text-aa-text-secondary mt-1">
                  One per line for a panel.
                </p>
              </div>

              {nextNote && (
                <div>
                  <span className={label}>What happens next</span>
                  <p className="text-[13px] text-aa-neutral-700 leading-relaxed">
                    {nextNote}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-[12px] text-aa-error-strong">{error}</p>
              )}
            </div>

            <div className="shrink-0 border-t border-aa-border px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy || !selectedApp}
                  className="px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
                  {mode === "edit" ? "Save changes" : "Add round"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[13px] font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors">
                  Cancel
                </button>
              </div>

              {mode === "edit" &&
                (confirmDelete ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="text-[12px] font-semibold text-aa-error-strong hover:underline">
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-[12px] font-semibold text-aa-text-secondary hover:underline">
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-[12px] font-semibold text-aa-text-secondary hover:text-aa-error-strong transition-colors">
                    Delete round
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

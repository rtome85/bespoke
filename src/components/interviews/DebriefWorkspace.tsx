import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { BackLink } from "~components/BackLink"
import { Checklist } from "~components/interviews/Checklist"
import { RatingInput } from "~components/interviews/RatingInput"
import { RoundStrip } from "~components/interviews/RoundStrip"
import { relativeDayLabel, roundLabel } from "~lib/interviews/selectors"
import { setRoundDebrief } from "~storage/savedApplications"
import type {
  Debrief,
  DebriefOutcome,
  SavedApplication
} from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  roundId: string
  onBack: () => void
  onSaved: (result: { advanced: boolean; appId: string }) => void
}

type Rating = 1 | 2 | 3 | 4 | 5
type FollowUp = { text: string; done?: boolean }

/** Form values for a debrief — empty defaults when none exists. Used for the
 * initial state and to hydrate once the round resolves (a deep-link load
 * mounts this before `apps` has populated). */
export function debriefFormValues(d: Debrief | undefined) {
  return {
    rating: d?.rating as Rating | undefined,
    assessment: d?.assessment ?? "",
    questionsAsked: d?.questionsAsked ?? "",
    followUps: (d?.followUps ?? []) as FollowUp[],
    outcome: (d?.outcome ?? "") as DebriefOutcome | ""
  }
}

const OUTCOMES: { value: DebriefOutcome; label: string }[] = [
  { value: "advance", label: "Advance to the next round" },
  { value: "offer", label: "Offer" },
  { value: "reject", label: "Reject" },
  { value: "waiting", label: "Still waiting" }
]

const card = "bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6"
const fieldLabel = "block text-[13px] font-semibold text-aa-text-primary mb-1.5"
const textField =
  "w-full px-3 py-2 bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors"

export function DebriefWorkspace({ apps, roundId, onBack, onSaved }: Props) {
  const found = useMemo(() => {
    for (const app of apps) {
      const round = (app.rounds ?? []).find((r) => r.id === roundId)
      if (round) return { app, round }
    }
    return undefined
  }, [apps, roundId])

  useEffect(() => {
    if (apps.length && !found) onBack()
  }, [apps.length, found, onBack])

  const d = found?.round.debrief
  const initial = debriefFormValues(d)
  const [rating, setRating] = useState<Rating | undefined>(initial.rating)
  const [assessment, setAssessment] = useState(initial.assessment)
  const [questionsAsked, setQuestionsAsked] = useState(initial.questionsAsked)
  const [followUps, setFollowUps] = useState<FollowUp[]>(initial.followUps)
  const [outcome, setOutcome] = useState<DebriefOutcome | "">(initial.outcome)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  // Deep-link load: this mounts with `apps` still empty, so the initializers
  // above ran against no round. Sync form state once the round resolves.
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current || !found) return
    hydrated.current = true
    if (!found.round.debrief) return
    const v = debriefFormValues(found.round.debrief)
    setRating(v.rating)
    setAssessment(v.assessment)
    setQuestionsAsked(v.questionsAsked)
    setFollowUps(v.followUps)
    setOutcome(v.outcome)
  }, [found])

  if (!found) return null
  const { app, round } = found
  const logged = !!d?.loggedAt

  const save = async () => {
    if (!outcome) {
      setError("Pick an outcome.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await setRoundDebrief(app.id, round.id, {
        rating,
        assessment: assessment.trim() || undefined,
        questionsAsked: questionsAsked.trim() || undefined,
        followUps: followUps.length ? followUps : undefined,
        outcome
      })
      onSaved({ advanced: outcome === "advance", appId: app.id })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the debrief.")
      setBusy(false)
    }
  }

  const saveLabel = logged
    ? "Save changes"
    : outcome === "advance"
      ? "Save & schedule next"
      : "Save debrief"

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BackLink label="Debriefs" onClick={onBack} />
          <span className="text-aa-neutral-400">/</span>
          <span className="text-[14px] font-semibold text-aa-text-primary truncate">
            {roundLabel(round)} — {app.company}
            {round.date ? ` · ${round.date}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saveLabel}
        </button>
      </div>

      <div className="space-y-4">
        <RoundStrip
          app={app}
          round={round}
          right={
            <span
              className={`inline-block px-2 py-0.5 rounded-aa-pill text-[10px] font-bold uppercase tracking-wide ${
                logged
                  ? "bg-aa-success-soft text-aa-success-strong"
                  : "bg-aa-warning-soft text-aa-warning-strong"
              }`}>
              {logged
                ? `Logged ${relativeDayLabel(d!.loggedAt!.slice(0, 10))}`
                : "No debrief yet"}
            </span>
          }
        />

        {error && <p className="text-[12px] text-aa-error-strong">{error}</p>}

        <div className={`${card} space-y-5`}>
          <div>
            <span className={fieldLabel}>How it went</span>
            <RatingInput
              value={rating}
              onChange={setRating}
              label="Overall rating"
            />
            <input
              type="text"
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="One line — how did it actually go?"
              className={`${textField} mt-2`}
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="debrief-questions">
              Questions they asked
            </label>
            <textarea
              id="debrief-questions"
              value={questionsAsked}
              onChange={(e) => setQuestionsAsked(e.target.value)}
              rows={4}
              placeholder="What came up — so you can prep the next round."
              className={`${textField} resize-y`}
            />
          </div>

          <div>
            <span className={fieldLabel}>Follow-ups</span>
            <Checklist
              hidePin
              items={followUps.map((f) => ({
                text: f.text,
                checked: f.done,
                userAdded: true
              }))}
              onChange={(next) =>
                setFollowUps(
                  next.map((p) => ({ text: p.text, done: p.checked }))
                )
              }
              addLabel="Add a follow-up"
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="debrief-outcome">
              Outcome
            </label>
            <select
              id="debrief-outcome"
              value={outcome}
              onChange={(e) =>
                setOutcome(e.target.value as DebriefOutcome | "")
              }
              className={textField}>
              {outcome === "" && (
                <option value="" disabled>
                  Choose an outcome…
                </option>
              )}
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-aa-text-secondary mt-1.5">
              {outcome === "offer"
                ? "Marks the application Offer."
                : outcome === "reject"
                  ? "Marks the application Reject."
                  : outcome === "advance"
                    ? "Keeps the application Interviewing and offers to schedule the next round."
                    : outcome === "waiting"
                      ? "Leaves the application status unchanged."
                      : "Sets the application status when you save."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

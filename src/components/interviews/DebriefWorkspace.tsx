import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { BackLink } from "~components/common/BackLink"
import { Checklist } from "~components/interviews/Checklist"
import { RatingInput } from "~components/interviews/RatingInput"
import { RoundStrip } from "~components/interviews/RoundStrip"
import { DEBRIEF_OUTCOME_OPTIONS } from "~constants/interviews"
import { relativeDayLabel, roundLabel } from "~lib/interviews/selectors"
import { setRoundDebrief } from "~storage/savedApplications"
import type {
  Debrief,
  DebriefFollowUp,
  DebriefOutcome,
  DebriefRating,
  SavedApplication
} from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  roundId: string
  onBack: () => void
  onSaved: (result: { advanced: boolean; appId: string }) => void
}

/** Form values for a debrief — empty defaults when none exists. Used for the
 * initial state and to hydrate once the round resolves (a deep-link load
 * mounts this before `apps` has populated). */
export function debriefFormValues(d: Debrief | undefined) {
  return {
    rating: d?.rating,
    assessment: d?.assessment ?? "",
    questionsAsked: d?.questionsAsked ?? "",
    followUps: d?.followUps ?? [],
    outcome: (d?.outcome ?? "") as DebriefOutcome | ""
  }
}

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
  const [rating, setRating] = useState<DebriefRating | undefined>(
    initial.rating
  )
  const [assessment, setAssessment] = useState(initial.assessment)
  const [questionsAsked, setQuestionsAsked] = useState(initial.questionsAsked)
  const [followUps, setFollowUps] = useState<DebriefFollowUp[]>(
    initial.followUps
  )
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BackLink label="Debriefs" onClick={onBack} />
          <span className="text-aa-neutral-400">/</span>
          <span className="text-aa-sm font-semibold text-aa-text-primary truncate">
            {roundLabel(round)} — {app.company}
            {round.date ? ` · ${round.date}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-aa-px-9 bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-aa-13 font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
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
              className={`inline-block px-2 py-0.5 rounded-aa-pill text-aa-10 font-bold uppercase tracking-wide ${
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

        {error && <p className="text-aa-caption text-aa-error-strong">{error}</p>}

        <div className="aa-card space-y-5">
          <div>
            <span className="aa-workspace-field-label">How it went</span>
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
              className="aa-workspace-field-input mt-2"
            />
          </div>

          <div>
            <label className="aa-workspace-field-label" htmlFor="debrief-questions">
              Questions they asked
            </label>
            <textarea
              id="debrief-questions"
              value={questionsAsked}
              onChange={(e) => setQuestionsAsked(e.target.value)}
              rows={4}
              placeholder="What came up — so you can prep the next round."
              className="aa-workspace-field-input resize-y"
            />
          </div>

          <div>
            <span className="aa-workspace-field-label">Follow-ups</span>
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
            <label className="aa-workspace-field-label" htmlFor="debrief-outcome">
              Outcome
            </label>
            <select
              id="debrief-outcome"
              value={outcome}
              onChange={(e) =>
                setOutcome(e.target.value as DebriefOutcome | "")
              }
              className="aa-workspace-field-input">
              {outcome === "" && (
                <option value="" disabled>
                  Choose an outcome…
                </option>
              )}
              {DEBRIEF_OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-aa-11 text-aa-text-secondary mt-1.5">
              {outcome === "offer"
                ? "Marks the application Offer."
                : outcome === "reject"
                  ? "Marks the application Reject."
                  : outcome === "advance"
                    ? "Keeps the application Interviewing and offers to schedule the next round."
                    : outcome === "waiting"
                      ? "Keeps the application Interviewing while you wait to hear back."
                      : "Sets the application status when you save."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

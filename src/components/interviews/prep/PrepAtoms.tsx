import { AlertCircle, Check, Clock, Loader2, X } from "lucide-react"
import { useId } from "react"

import { ConfirmDialog } from "~components/common/ConfirmDialog"
import type { Countdown, PrepStage } from "~hooks/interviews/usePrepWorkspace"
import type { ResearchSource } from "~types/config"

/**
 * The small parts of the prep run sheet. Kept apart from the composition so
 * the page file reads as an outline of the sheet rather than as markup.
 */

export function CountdownChip({ countdown }: { countdown: Countdown }) {
  const tone = countdown.urgent ? "aa-countdown-soon" : "aa-countdown-later"
  return (
    <span className={`aa-countdown ${tone}`}>
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      {countdown.past
        ? `started ${countdown.label}`
        : `starts ${countdown.label}`}
    </span>
  )
}

/**
 * Ticked over total. The old green "Ready" pill fired the instant any array
 * was non-empty — it reported that the model had written something, before the
 * user had read a word. This reports the user's own state.
 */
export function ReadinessMeter({
  done,
  total,
  generatedLabel
}: {
  done: number
  total: number
  generatedLabel?: string
}) {
  if (!total) return null
  const pct = Math.round((done / total) * 100)
  const complete = done === total
  return (
    <div>
      <div className="flex items-baseline justify-between gap-aa-3">
        <span className="text-aa-caption font-semibold text-aa-text-secondary">
          {complete ? "Everything ticked" : `${done} of ${total} ready`}
        </span>
        {generatedLabel && (
          <span className="text-aa-caption text-aa-text-secondary">
            {generatedLabel}
          </span>
        )}
      </div>
      <div
        className="aa-meter mt-aa-1"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Items you've marked ready">
        <div className="aa-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/**
 * A failure rendered against the thing that failed, with the retry that fixes
 * exactly that thing. The old page pushed prefixed strings into one
 * `role="status"` stack that could sit thousands of pixels from the control
 * responsible, with no retry and no way to dismiss it.
 */
export function SectionError({
  message,
  retryLabel,
  onRetry,
  onDismiss
}: {
  message: string
  retryLabel?: string
  onRetry?: () => void
  onDismiss: () => void
}) {
  return (
    <div className="aa-section-error" role="alert">
      <span className="flex items-start gap-aa-2">
        <AlertCircle
          className="w-3.5 h-3.5 shrink-0 mt-aa-px-1"
          aria-hidden="true"
        />
        {message}
      </span>
      <span className="flex shrink-0 items-center gap-aa-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="aa-section-error-btn">
            {retryLabel ?? "Try again"}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this error"
          className="aa-section-dismiss">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}

/** The thin-inputs nudge — kept out of the red failure zone it used to share. */
export function ThinHint({
  message,
  onDismiss
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <div className="aa-section-hint">
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this tip"
        className="aa-section-dismiss">
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * The wait, named. Research aborts at 45s and prep at 60s, sequentially, so
 * the honest ceiling is well past the "about 30 seconds" the old empty state
 * promised. Saying which step is running, and counting up, is the difference
 * between "this is slow" and "this is broken".
 */
export function GenerateProgress({
  stage,
  elapsed,
  company,
  roundName
}: {
  stage: PrepStage
  elapsed: number
  company: string
  roundName: string
}) {
  const running = stage !== "idle"
  const step = stage === "research" ? 1 : 2
  const what =
    stage === "research"
      ? `Researching ${company}`
      : `Writing prep for a ${roundName}`
  // The live region stays mounted while idle and only its contents come and
  // go. A `role="status"` element inserted into the DOM at the same moment as
  // its text is not reliably announced — assistive tech has to be watching the
  // region before the change happens for it to count as one. Empty, the flex
  // box has no line boxes and so no height.
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-aa-2 text-aa-13 text-aa-text-secondary">
      {running && (
        <>
          <Loader2
            className="w-3.5 h-3.5 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span>
            Step {step} of 2 · {what}
            {elapsed > 8 && ` · ${elapsed}s`}
          </span>
        </>
      )}
    </p>
  )
}

/** The shape of the answer, while the answer is still coming. */
export function PrepSkeleton() {
  return (
    <div className="space-y-aa-6" aria-hidden="true">
      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-aa-3">
          <div className="aa-skeleton h-4 w-aa-px-140" />
          <div className="space-y-aa-2">
            {[0, 1, 2].map((line) => (
              <div key={line} className="aa-skeleton h-3 w-full" />
            ))}
            <div className="aa-skeleton h-3 w-aa-px-300" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Where the research came from, graded. Repeating an unverified claim about
 * the company is a live embarrassment in the room, so an ungrounded source is
 * called out in warning colour at the point of reading.
 */
export function ResearchProvenance({
  source,
  label,
  stale
}: {
  source?: ResearchSource
  label?: string
  stale: boolean
}) {
  if (source && label) {
    return (
      <p
        className={`text-aa-11 ${
          source === "model"
            ? "text-aa-warning-strong"
            : "text-aa-text-secondary"
        }`}>
        Source: {label}
        {stale && " · over a month old"}
      </p>
    )
  }
  if (stale) {
    return (
      <p className="text-aa-11 text-aa-warning-strong">
        Over a month old — worth refreshing.
      </p>
    )
  }
  return null
}

export function GrantSiteBanner({
  host,
  onAllow
}: {
  host: string
  onAllow: () => void
}) {
  return (
    <div className="aa-message-info flex items-start justify-between gap-aa-3">
      <span>
        Bespoke can read {host} — the company's own site — to research them
        without a search account.
      </span>
      <button
        type="button"
        onClick={onAllow}
        className="shrink-0 rounded-aa-sm font-semibold text-aa-neutral-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary">
        Allow
      </button>
    </div>
  )
}

/**
 * Notes. Properly labelled — the field previously had a placeholder and
 * nothing else, so it announced as an unnamed edit field and lost its only
 * name as soon as the user typed. The save confirmation exists because the
 * 600ms debounce used to write in complete silence.
 */
export function NotesPanel({
  id,
  value,
  onChange,
  saved
}: {
  id: string
  value: string
  onChange: (v: string) => void
  saved: boolean
}) {
  const fieldId = useId()
  return (
    <section id={id} className="aa-runsheet-panel">
      <div className="flex items-center justify-between gap-aa-3">
        <label htmlFor={fieldId} className="aa-runsheet-title">
          My notes
        </label>
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-aa-1 text-aa-11 font-semibold text-aa-success-strong empty:hidden">
          {saved && (
            <>
              <Check className="w-3 h-3" aria-hidden="true" />
              Saved
            </>
          )}
        </span>
      </div>
      <p className="text-aa-11 text-aa-text-secondary">
        Kept when you regenerate — and fed back in, so what you know here shapes
        the next run.
      </p>
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Questions to ask, things to double-check, reminders…"
        className="aa-workspace-field-input resize-y"
      />
    </section>
  )
}

/**
 * The regeneration confirm, through the app's own focus-trapped dialog. The
 * old page raised `window.confirm` — the last native dialog of its kind in the
 * feature — for a decision that discards model-written work.
 */
export function RegenerateDialog({
  open,
  onConfirm,
  onCancel
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <ConfirmDialog
      title="Regenerate this prep?"
      message="Regenerate replaces the AI-suggested items across all five sections. Anything you ticked, pinned or added is kept."
      confirmLabel="Regenerate"
      cancelLabel="Keep what's here"
      onConfirm={onConfirm}
      onCancel={onCancel}
      destructive
    />
  )
}

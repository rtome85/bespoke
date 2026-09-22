import { Check, Copy, Loader2, RefreshCw, X } from "lucide-react"
import { useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { MarkdownPreview } from "~components/documentPreview/MarkdownPreview"
import {
  PrepSkeleton,
  SectionError
} from "~components/interviews/prep/PrepAtoms"
import type { LessonView } from "~hooks/interviews/usePrepWorkspace"
import { useModalFocusTrap } from "~hooks/useModalFocusTrap"
import { lessonMathToText } from "~lib/interviews/lessonMath"
import { relativeTimeLabel } from "~lib/interviews/selectors"

interface Props {
  lesson: LessonView
  onClose: () => void
  onRewrite: () => void
  /** Resolves to whether the clipboard actually took it (see `copyText`). */
  onCopy: (text: string) => Promise<boolean>
}

/**
 * "Learn more" — one exercise or drill question, expanded into a lesson.
 *
 * Docked to the right edge at the full height of the viewport, because that
 * is the shape long-form reading wants: the sheet's items are short enough to
 * sit in a column, a lesson is not. Portalled to <body> so the panel is
 * measured against the viewport rather than against the run sheet's grid
 * column, which is where a `fixed` child would otherwise be clipped once an
 * ancestor picks up a transform.
 *
 * The item it came from is repeated at the top. The lesson is worth reading
 * against the task it explains, and the sheet behind the panel is covered.
 */
export function LessonPanel({ lesson, onClose, onRewrite, onCopy }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)
  // Keyed on the message rather than on a boolean, so dismissing one failure
  // doesn't swallow the next one when a rewrite fails the same way twice
  // running — a new message is a new error.
  const [dismissed, setDismissed] = useState<string>()

  useModalFocusTrap(panelRef, onClose, closeRef)

  // `parseLesson` already does this to everything it stores, so for a lesson
  // written since that landed this is a no-op. It runs again here for the ones
  // written before it, which are sitting in storage with their `$\rightarrow$`
  // intact — and it runs before the copy as well as before the render, so the
  // clipboard never gets notation the panel didn't show.
  const markdown = lesson.markdown
    ? lessonMathToText(lesson.markdown)
    : undefined

  const copy = async () => {
    if (!markdown) return
    if (!(await onCopy(markdown))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2_000)
  }

  const showError = !!lesson.error && lesson.error !== dismissed

  return createPortal(
    <div className="fixed inset-0 z-40 bg-black/30 font-aa" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-aa-px-640 max-w-aa-viewport-safe flex-col border-l border-aa-border bg-aa-surface shadow-xl focus:outline-none"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-aa-3 border-b border-aa-border px-aa-5 py-aa-4">
          <div className="min-w-0">
            <p className="text-aa-10 font-bold uppercase tracking-aa-wider-10 text-aa-text-secondary">
              {lesson.kind === "exercise" ? "Exercise" : "Question"} · lesson
            </p>
            <h2
              id={titleId}
              className="mt-aa-1 text-aa-17 font-semibold leading-snug tracking-aa-tighter-2 text-aa-text-primary">
              {lesson.title}
            </h2>
            {lesson.topic && (
              <span className="aa-topic-chip mt-aa-2">{lesson.topic}</span>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the lesson"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-aa-md text-aa-text-secondary transition-colors hover:bg-aa-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-aa-4 overflow-y-auto px-aa-5 py-aa-4">
          {lesson.detail && (
            <div className="border-l-2 border-aa-border pl-aa-3">
              <p className="text-aa-11 font-semibold uppercase tracking-wider text-aa-text-secondary">
                {lesson.kind === "exercise"
                  ? "The task"
                  : "The answer on your sheet"}
              </p>
              <p className="mt-aa-1 whitespace-pre-line text-aa-13 leading-relaxed text-aa-neutral-700">
                {lesson.detail}
              </p>
            </div>
          )}

          {showError && (
            <SectionError
              message={lesson.error!}
              retryLabel="Try again"
              onRetry={onRewrite}
              onDismiss={() => setDismissed(lesson.error)}
            />
          )}

          {/* A rewrite keeps the lesson it is replacing on screen: the new one
              may fail, and an empty panel would have thrown away something the
              user already paid a model call for. Only a first run, with
              nothing to show, gets the skeleton. */}
          {markdown ? (
            <div className="text-aa-neutral-700">
              <MarkdownPreview content={markdown} />
            </div>
          ) : (
            lesson.busy && <PrepSkeleton />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-aa-3 border-t border-aa-border px-aa-5 py-aa-3">
          <span
            role="status"
            aria-live="polite"
            className="flex min-w-0 items-center gap-aa-2 text-aa-11 text-aa-text-secondary">
            {lesson.busy ? (
              <>
                <Loader2
                  className="h-3 w-3 shrink-0 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Writing the lesson — this one runs longer than the sheet.
              </>
            ) : (
              lesson.generatedAt &&
              `Written ${relativeTimeLabel(lesson.generatedAt)}`
            )}
          </span>
          <div className="flex shrink-0 items-center gap-aa-2">
            {markdown && (
              <button
                type="button"
                onClick={() => void copy()}
                className="aa-btn-secondary inline-flex items-center gap-aa-2">
                {copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <button
              type="button"
              onClick={onRewrite}
              disabled={lesson.busy}
              className="aa-btn-secondary inline-flex items-center gap-aa-2">
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  lesson.busy ? "animate-spin motion-reduce:animate-none" : ""
                }`}
                aria-hidden="true"
              />
              {markdown ? "Rewrite" : "Retry"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

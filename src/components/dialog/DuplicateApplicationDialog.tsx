import { CopyCheck, X } from "lucide-react"
import { useId, useRef } from "react"
import { createPortal } from "react-dom"

import { useModalFocusTrap } from "~hooks/useModalFocusTrap"
import {
  duplicateApplicationDetail,
  duplicateApplicationTitle
} from "~lib/dialog/duplicateApplications"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  application: SavedApplication
  onGoToApplications: () => void
  onAnalyzeAnyway: () => void
  onDismiss: () => void
}

/**
 * Shown instead of a match analysis when the company + job title already
 * exist in the tracked list. Portalled to <body> for the same reason as
 * ConfirmDialog. Dismissing (X / Escape / backdrop) leaves the user on the
 * form with the details intact; "Analyze anyway" scores the job regardless.
 */
export function DuplicateApplicationDialog({
  application,
  onGoToApplications,
  onAnalyzeAnyway,
  onDismiss
}: Props) {
  const titleId = useId()
  const detailId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  useModalFocusTrap(panelRef, onDismiss, primaryRef)

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-aa-4 font-aa"
      onClick={onDismiss}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        className="w-full max-w-aa-px-400 bg-aa-surface border border-aa-border rounded-aa-lg shadow-xl p-aa-5 flex flex-col gap-aa-3"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-aa-3">
          <div className="flex items-center gap-aa-2">
            <span className="w-8 h-8 shrink-0 grid place-items-center rounded-aa-md bg-aa-primary-soft text-aa-primary">
              <CopyCheck size={16} />
            </span>
            <h2
              id={titleId}
              className="text-aa-sm font-semibold text-aa-text-primary">
              {duplicateApplicationTitle(application)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="w-7 h-7 shrink-0 grid place-items-center rounded-aa-md text-aa-text-secondary hover:bg-aa-neutral-100 transition-colors">
            <X size={14} />
          </button>
        </div>
        <p
          id={detailId}
          className="text-aa-13 leading-aa-1.4 text-aa-text-secondary">
          {duplicateApplicationDetail(application)}
        </p>
        <div className="flex items-center justify-end gap-aa-2 pt-aa-1">
          <button
            type="button"
            onClick={onAnalyzeAnyway}
            className="aa-btn-secondary">
            Analyze anyway
          </button>
          <button
            ref={primaryRef}
            type="button"
            onClick={onGoToApplications}
            className="aa-btn-accent">
            Go to applications
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

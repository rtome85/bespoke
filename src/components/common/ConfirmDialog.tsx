import { useId, useRef } from "react"
import { createPortal } from "react-dom"

import { useModalFocusTrap } from "~hooks/useModalFocusTrap"

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** Irreversible action (e.g. a delete): start focus on Cancel so a stray
   *  Enter or Space doesn't confirm it. */
  destructive?: boolean
}

/**
 * Modal yes/no confirmation. Portalled to <body> because the panels that
 * open it are `overflow-hidden` + translated, which would otherwise clip a
 * fixed overlay to the panel box.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false
}: Props) {
  const titleId = useId()
  const messageId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useModalFocusTrap(panelRef, onCancel, destructive ? cancelRef : confirmRef)

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-aa-4 font-aa"
      onClick={onCancel}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-full max-w-aa-px-400 bg-aa-surface border border-aa-border rounded-aa-lg shadow-xl p-aa-5 flex flex-col gap-aa-3"
        onClick={(event) => event.stopPropagation()}>
        <h2
          id={titleId}
          className="text-aa-sm font-semibold text-aa-text-primary">
          {title}
        </h2>
        <p
          id={messageId}
          className="text-aa-13 leading-aa-1.4 text-aa-text-secondary">
          {message}
        </p>
        <div className="flex items-center justify-end gap-aa-2 pt-aa-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="aa-btn-secondary">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="aa-btn-accent">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

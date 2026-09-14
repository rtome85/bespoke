import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
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
  onCancel
}: Props) {
  const titleId = useId()
  const messageId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Move focus into the dialog on open and hand it back to whatever had it
  // on close. Mount-only: re-running would re-record the opener as the
  // dialog's own button and restore focus to a node that is already gone.
  useEffect(() => {
    const opener = document.activeElement
    confirmRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel()
        return
      }
      if (event.key !== "Tab") return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      // Wrap at both ends, and pull focus back in if it escaped the dialog.
      if (
        event.shiftKey &&
        (active === first || !panelRef.current?.contains(active))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (active === last || !panelRef.current?.contains(active))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onCancel])

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
          <button type="button" onClick={onCancel} className="aa-btn-secondary">
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

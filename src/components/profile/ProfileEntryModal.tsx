import { X } from "lucide-react"
import { useId, useRef } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"

import { useModalFocusTrap } from "~hooks/useModalFocusTrap"

interface Props {
  title: string
  saveLabel: string
  onSave: () => void
  onCancel: () => void
  children: ReactNode
}

/**
 * Shell for the profile lists' add forms (education, certificates), matching
 * ProviderDetailModal: same panel, header, footer and focus handling.
 *
 * Portalled to <body> — the settings area is a translated, overflow-hidden
 * panel that would otherwise clip a fixed overlay to its own box.
 */
export function ProfileEntryModal({
  title,
  saveLabel,
  onSave,
  onCancel,
  children
}: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useModalFocusTrap(panelRef, onCancel, closeRef)

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-aa-4 font-aa"
      onClick={onCancel}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-aa-vh-90 w-full max-w-aa-px-640 flex-col overflow-hidden rounded-aa-xl bg-aa-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center gap-aa-3 border-b border-aa-border px-aa-px-22 py-4">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-aa-body font-semibold text-aa-text-primary">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="aa-toolbar-btn shrink-0">
            <X className="h-aa-px-18 w-aa-px-18" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-aa-px-22">{children}</div>

        <footer className="flex items-center justify-end gap-aa-3 border-t border-aa-border bg-aa-neutral-50 px-aa-px-22 py-3.5">
          <button type="button" onClick={onCancel} className="aa-btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onSave} className="aa-btn-accent">
            {saveLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

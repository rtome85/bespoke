import { X } from "lucide-react"
import { useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { useModalFocusTrap } from "~hooks/useModalFocusTrap"

interface PromptDialogProps {
  isOpen: boolean
  title: string
  prompt: string
  onClose: () => void
  onSave: (prompt: string) => void
}

export function PromptDialog({ isOpen, ...props }: PromptDialogProps) {
  if (!isOpen) return null
  return <PromptDialogPanel {...props} />
}

/**
 * Mounted only while open, so the draft starts from the current prompt each
 * time and the focus trap's mount-only effects line up with open/close.
 *
 * Portalled to <body> — the settings area is a translated, overflow-hidden
 * panel that would otherwise clip a fixed overlay to its own box.
 */
function PromptDialogPanel({
  title,
  prompt,
  onClose,
  onSave
}: Omit<PromptDialogProps, "isOpen">) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editedPrompt, setEditedPrompt] = useState(prompt)

  const handleSave = () => {
    onSave(editedPrompt)
    onClose()
  }

  useModalFocusTrap(panelRef, onClose, textareaRef)

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-aa-4 font-aa"
      onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-aa-vh-90 w-full max-w-4xl flex-col overflow-hidden rounded-aa-xl bg-aa-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center gap-aa-3 border-b border-aa-border px-aa-px-22 py-4">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-aa-body font-semibold text-aa-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="aa-toolbar-btn shrink-0">
            <X className="h-aa-px-18 w-aa-px-18" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-aa-px-22 py-5">
          <textarea
            ref={textareaRef}
            aria-labelledby={titleId}
            value={editedPrompt}
            onChange={(event) => setEditedPrompt(event.target.value)}
            className="aa-textarea min-h-aa-px-400 resize-none text-sm"
            placeholder="Enter your prompt here..."
          />
        </div>

        <footer className="flex items-center justify-end gap-aa-3 border-t border-aa-border bg-aa-neutral-50 px-aa-px-22 py-3.5">
          <button type="button" onClick={onClose} className="aa-btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="aa-btn-accent">
            Save
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

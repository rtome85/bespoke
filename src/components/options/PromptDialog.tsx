import React from "react"

interface PromptDialogProps {
  isOpen: boolean
  title: string
  prompt: string
  onClose: () => void
  onSave: (prompt: string) => void
}

export function PromptDialog({
  isOpen,
  title,
  prompt,
  onClose,
  onSave
}: PromptDialogProps) {
  const [editedPrompt, setEditedPrompt] = React.useState(prompt)

  React.useEffect(() => {
    setEditedPrompt(prompt)
  }, [prompt])

  const handleSave = () => {
    onSave(editedPrompt)
    onClose()
  }

  const handleCancel = () => {
    setEditedPrompt(prompt)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-canvas border-2 border-ink w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        <div className="px-6 py-4 border-b-2 border-ink">
          <h3 className="font-heading text-[13px] font-bold uppercase tracking-[0.1em] text-ink">{title}</h3>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full h-full min-h-[400px] px-4 py-3 bg-white border-2 border-canvas-input-border text-ink text-sm font-mono resize-none focus:outline-none focus:border-ink transition-colors"
            placeholder="Enter your prompt here..."
          />
        </div>

        <div className="px-6 py-4 border-t-2 border-canvas-divide flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 bg-white border-2 border-ink text-ink text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:bg-canvas transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

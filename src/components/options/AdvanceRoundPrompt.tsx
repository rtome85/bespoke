import { X } from "lucide-react"

interface Props {
  onAdd: () => void
  onDismiss: () => void
}

export function AdvanceRoundPrompt({ onAdd, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-4 py-3 bg-aa-text-primary text-aa-surface rounded-aa-lg shadow-xl text-[13px]">
      <span>Round logged. Schedule the next one?</span>
      <button
        type="button"
        onClick={onAdd}
        className="font-semibold text-aa-primary-hover hover:underline">
        Add round
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-aa-neutral-400 hover:text-aa-surface">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

import { Sparkles } from "lucide-react"

interface Props {
  onApply: () => void
  onSaveForLater: () => void
  onDiscard: () => void
}

export function TriageActions({ onApply, onSaveForLater, onDiscard }: Props) {
  return (
    <div className="p-aa-6 flex flex-col gap-aa-4">
      <div className="flex flex-col gap-aa-3">
        <div className="flex gap-aa-3">
          <button
            onClick={onApply}
            className="flex-1 flex items-center justify-center gap-aa-2 py-3 rounded-aa-md bg-aa-primary text-aa-text-on-primary text-aa-sm font-semibold hover:bg-aa-primary-hover transition-colors">
            <Sparkles size={16} className="shrink-0" />
            Generate Docs
          </button>
          <button
            onClick={onSaveForLater}
            className="flex-1 flex items-center justify-center py-3 rounded-aa-md bg-aa-surface border border-aa-primary text-aa-primary text-aa-sm font-semibold hover:bg-aa-primary-soft transition-colors">
            Save for later
          </button>
        </div>
        <button
          onClick={onDiscard}
          className="self-center px-aa-3 py-aa-2 text-aa-13 font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors">
          Not a fit
        </button>
      </div>
    </div>
  )
}

import { Sparkles } from "lucide-react"

interface Props {
  onApply: () => void
  onSaveForLater: () => void
  onDiscard: () => void
}

export function TriageActions({ onApply, onSaveForLater, onDiscard }: Props) {
  return (
    <div className="flex flex-col items-center gap-aa-3">
      <button
        onClick={onApply}
        className="w-full flex items-center justify-center gap-aa-2 px-aa-4 py-3.5 rounded-aa-md bg-aa-primary text-aa-text-on-primary text-aa-15 font-semibold hover:bg-aa-primary-hover transition-colors">
        <Sparkles size={16} className="shrink-0" />
        Generate Docs
      </button>
      <div className="flex justify-center gap-aa-6">
        <button
          onClick={onSaveForLater}
          className="text-aa-13 font-semibold text-aa-primary hover:text-aa-primary-hover transition-colors">
          Save for later
        </button>
        <button
          onClick={onDiscard}
          className="text-aa-13 font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors">
          Not a fit
        </button>
      </div>
    </div>
  )
}

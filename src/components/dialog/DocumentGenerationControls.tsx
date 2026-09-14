import { Sparkles } from "lucide-react"
import { useState } from "react"

import { ConfirmDialog } from "~components/common/ConfirmDialog"

interface Props {
  isLoading: boolean
  progress: number
  error: string
  hasDocuments: boolean
  onGenerate: () => void
}

export function DocumentGenerationControls({
  isLoading,
  progress,
  error,
  hasDocuments,
  onGenerate
}: Props) {
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)

  return (
    <div className="flex flex-col gap-aa-2 px-2">
      {isLoading ? (
        <div className="flex flex-col gap-aa-2">
          <div className="w-full bg-aa-neutral-200 h-2.5 rounded-aa-pill overflow-hidden">
            <div
              className="h-2.5 bg-aa-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-aa-caption text-aa-text-secondary text-center">
            Generating your documents… this may take a minute
          </p>
        </div>
      ) : (
        <button
          onClick={() =>
            hasDocuments ? setConfirmingRegenerate(true) : onGenerate()
          }
          className="flex items-center justify-center gap-aa-2 py-3 rounded-aa-md bg-aa-primary text-aa-text-on-primary text-aa-sm font-semibold hover:bg-aa-primary-hover transition-colors">
          <Sparkles size={16} />
          {hasDocuments
            ? "Regenerate CV + cover letter"
            : "Generate CV + cover letter"}
        </button>
      )}
      {error && <p className="text-aa-13 text-aa-error-strong">{error}</p>}
      {confirmingRegenerate && (
        <ConfirmDialog
          title="Regenerate documents?"
          message="Continuing replaces the CV and cover letter generated earlier — the previous versions will be lost and can't be recovered."
          confirmLabel="Regenerate"
          onConfirm={() => {
            setConfirmingRegenerate(false)
            onGenerate()
          }}
          onCancel={() => setConfirmingRegenerate(false)}
        />
      )}
    </div>
  )
}

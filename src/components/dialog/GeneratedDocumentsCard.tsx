import { Eye } from "lucide-react"

import type { GeneratedDocuments } from "~types/dialog"
import type { DocumentPreviewTab } from "~types/documentPreview"

interface Props {
  documents: GeneratedDocuments
  previewError: string
  onPreview: (tab: DocumentPreviewTab, documents: GeneratedDocuments) => void
}

export function GeneratedDocumentsCard({
  documents,
  previewError,
  onPreview
}: Props) {
  return (
    <>
      <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
        {(
          [
            { tab: "resume", label: "Resume" },
            { tab: "coverLetter", label: "Cover letter" }
          ] as const
        ).map((file, index) => (
          <div
            key={file.label}
            className={`flex items-center justify-between px-aa-4 py-aa-4 ${
              index === 0 ? "border-b border-aa-border" : ""
            }`}>
            <span className="text-[14px] font-semibold text-aa-text-primary">
              {file.label}
            </span>
            <button
              onClick={() => onPreview(file.tab, documents)}
              className="flex items-center gap-[6px] rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-[14px] py-2 text-[11px] font-semibold text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
              <Eye size={14} />
              Preview
            </button>
          </div>
        ))}
      </div>
      {previewError && (
        <p className="text-[13px] text-aa-error-strong">{previewError}</p>
      )}
    </>
  )
}

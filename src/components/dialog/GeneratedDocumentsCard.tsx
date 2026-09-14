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
      <div className="bg-aa-surface border-t border-aa-border overflow-hidden">
        {(
          [
            { tab: "resume", label: documents.resumeFilename },
            { tab: "coverLetter", label: documents.coverLetterFilename }
          ] as const
        ).map((file, index) => (
          <div
            key={file.label}
            className="flex items-center justify-between px-aa-4 py-aa-2">
            <span className="text-aa-sm font-semibold text-aa-text-primary">
              {file.label}
            </span>
            <button
              onClick={() => onPreview(file.tab, documents)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-aa-11 font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors">
              <Eye size={14} />
              Preview
            </button>
          </div>
        ))}
      </div>
      {previewError && (
        <p className="text-aa-13 text-aa-error-strong">{previewError}</p>
      )}
    </>
  )
}

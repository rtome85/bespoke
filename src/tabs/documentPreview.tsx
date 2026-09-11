import { DocumentPreviewPanel } from "~components/DocumentPreviewPanel"
import { useDebouncedStorage } from "~lib/useDebouncedStorage"
import { STORAGE_KEYS } from "~storage/keys"
import type { DocumentPreviewDraft } from "~types/documentPreview"

import "../style.css"

// A standalone popup window (opened centered on screen by
// background/messages/openDocumentPreview.ts) so the preview/edit surface
// isn't confined to the side panel's docked width. The side panel writes
// the initial snapshot to chrome.storage.local before opening this window;
// from then on this page is the sole writer of edits, and the side panel
// picks them up live via chrome.storage.onChanged.
function DocumentPreviewTab() {
  const [draft, setDraft, draftRevision] =
    useDebouncedStorage<DocumentPreviewDraft | null>(
      STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT,
      null
    )

  if (!draft) {
    return (
      <div className="h-screen bg-aa-surface flex items-center justify-center font-aa">
        <p className="text-[13px] text-aa-text-secondary">Loading…</p>
      </div>
    )
  }

  return (
    <DocumentPreviewPanel
      draftRevision={draftRevision}
      activeTab={draft.activeTab}
      onActiveTabChange={(tab) =>
        setDraft((prev) => (prev ? { ...prev, activeTab: tab } : prev))
      }
      resumeContent={draft.resumeContent}
      resumeFilename={draft.resumeFilename}
      coverLetterContent={draft.coverLetterContent}
      coverLetterFilename={draft.coverLetterFilename}
      onChangeContent={(patch) =>
        setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
      }
    />
  )
}

export default DocumentPreviewTab

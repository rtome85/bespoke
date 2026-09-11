export type DocumentPreviewTab = "resume" | "coverLetter"

// Bridges the generated documents between the side panel (writer of the
// initial snapshot) and the standalone preview/edit window (writer of every
// edit) via chrome.storage.local — see STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT.
export interface DocumentPreviewDraft {
  resumeContent: string
  resumeFilename: string
  coverLetterContent: string
  coverLetterFilename: string
  activeTab: DocumentPreviewTab
}

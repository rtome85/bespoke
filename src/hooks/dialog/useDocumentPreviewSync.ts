import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import type { GenerationResult } from "~types/dialog"
import type { DocumentPreviewDraft } from "~types/documentPreview"

export function mergeDocumentPreviewDraft(
  current: GenerationResult | null,
  next: DocumentPreviewDraft
): GenerationResult | null {
  return current
    ? {
        ...current,
        resumeContent: next.resumeContent,
        coverLetterContent: next.coverLetterContent
      }
    : current
}

export function useDocumentPreviewSync(
  setResult: Dispatch<SetStateAction<GenerationResult | null>>
) {
  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "local" || !(STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT in changes))
        return

      const next = changes[STORAGE_KEYS.DOCUMENT_PREVIEW_DRAFT].newValue as
        | DocumentPreviewDraft
        | undefined
      if (!next) return

      setResult((current) => mergeDocumentPreviewDraft(current, next))
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [setResult])
}

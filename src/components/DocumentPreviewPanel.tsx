import {
  Bold,
  Check,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  RotateCcw,
  X
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { MarkdownPreview } from "~components/MarkdownPreview"
import { SegmentedControl } from "~components/SegmentedControl"
import { downloadMarkdownAsPdf } from "~lib/pdf"
import type { DocumentPreviewTab } from "~types/documentPreview"
import { downloadMarkdownFile } from "~utils/documentFormatter"

type ViewMode = "edit" | "preview"

interface Props {
  // Bumps whenever the draft was replaced by something other than this
  // window's own edits (e.g. the side panel re-seeding it after a
  // Regenerate, while this window stayed open) — see openedWith below.
  draftRevision: number
  activeTab: DocumentPreviewTab
  onActiveTabChange: (tab: DocumentPreviewTab) => void
  resumeContent: string
  resumeFilename: string
  coverLetterContent: string
  coverLetterFilename: string
  onChangeContent: (patch: {
    resumeContent?: string
    coverLetterContent?: string
  }) => void
}

const toolbarBtn =
  "w-7 h-7 grid place-items-center rounded-aa-sm text-aa-neutral-500 hover:bg-aa-neutral-200 transition-colors"

// Fills its own dedicated browser window (opened centered on screen by
// background/messages/openDocumentPreview.ts) — a real window, not an
// overlay, since a chrome.sidePanel can't paint outside its own docked
// strip. Edits write straight back through `onChangeContent`; the caller
// (tabs/documentPreview.tsx) bridges that to chrome.storage so the side
// panel picks them up live.
export function DocumentPreviewPanel({
  draftRevision,
  activeTab,
  onActiveTabChange,
  resumeContent,
  resumeFilename,
  coverLetterContent,
  coverLetterFilename,
  onChangeContent
}: Props) {
  // "What this document looked like before your current edits" — the
  // baseline Revert targets. The window can be re-seeded with a fresh draft
  // while it stays open (re-clicking Preview after a Regenerate reuses the
  // same window), so this re-baselines on every such external replacement,
  // not just once at mount.
  const [openedWith, setOpenedWith] = useState({
    resumeContent,
    coverLetterContent
  })
  const lastRevision = useRef(draftRevision)
  if (draftRevision !== lastRevision.current) {
    lastRevision.current = draftRevision
    setOpenedWith({ resumeContent, coverLetterContent })
  }
  const [downloadError, setDownloadError] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("edit")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const isResume = activeTab === "resume"
  const content = isResume ? resumeContent : coverLetterContent
  const filename = isResume ? resumeFilename : coverLetterFilename
  const original = isResume
    ? openedWith.resumeContent
    : openedWith.coverLetterContent
  const isEdited = content !== original

  const setContent = (next: string) => {
    onChangeContent(
      isResume ? { resumeContent: next } : { coverLetterContent: next }
    )
  }

  const wrapSelection = (marker: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const next =
      content.slice(0, start) +
      marker +
      content.slice(start, end) +
      marker +
      content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + marker.length, end + marker.length)
    })
  }

  const toggleBullets = () => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = content.lastIndexOf("\n", start - 1) + 1
    // A non-collapsed selection that ends exactly on a newline (e.g. a
    // whole-line selection) shouldn't pull the following line in — look up
    // the boundary from just before that trailing newline instead.
    const lineEndLookup =
      end > start && content[end - 1] === "\n" ? end - 1 : end
    const lineEndIdx = content.indexOf("\n", lineEndLookup)
    const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx
    const lines = content.slice(lineStart, lineEnd).split("\n")
    const allBulleted = lines.every(
      (l) => l.trim() === "" || l.startsWith("- ")
    )
    const nextBlock = lines
      .map((l) =>
        l.trim() === "" ? l : allBulleted ? l.replace(/^- /, "") : `- ${l}`
      )
      .join("\n")
    setContent(content.slice(0, lineStart) + nextBlock + content.slice(lineEnd))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(lineStart, lineStart + nextBlock.length)
    })
  }

  const insertLink = () => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const url = window.prompt("Link URL", "https://")
    if (!url) return
    const label = content.slice(start, end) || "link text"
    const markdown = `[${label}](${url})`
    setContent(content.slice(0, start) + markdown + content.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + markdown.length
      el.setSelectionRange(pos, pos)
    })
  }

  const setHeading = (level: 1 | 2 | 3) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = content.lastIndexOf("\n", start - 1) + 1
    // See the matching comment in toggleBullets — avoid pulling the
    // following line in when the selection ends right on a newline.
    const lineEndLookup =
      end > start && content[end - 1] === "\n" ? end - 1 : end
    const lineEndIdx = content.indexOf("\n", lineEndLookup)
    const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx
    const marker = "#".repeat(level) + " "
    const nextBlock = content
      .slice(lineStart, lineEnd)
      .split("\n")
      .map((l) => (l.trim() === "" ? l : marker + l.replace(/^#{1,6}\s+/, "")))
      .join("\n")
    setContent(content.slice(0, lineStart) + nextBlock + content.slice(lineEnd))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(lineStart, lineStart + nextBlock.length)
    })
  }

  const handleDownloadMarkdown = () => {
    downloadMarkdownFile(filename, content)
  }

  const handleDownloadPdf = async () => {
    setDownloadError("")
    try {
      await downloadMarkdownAsPdf(content, filename)
    } catch (error) {
      console.error("PDF export failed:", error)
      setDownloadError("Failed to generate PDF. Please try again.")
    }
  }

  return (
    <div className="h-screen bg-aa-surface flex flex-col font-aa text-aa-text-primary">
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-aa-border">
        <SegmentedControl<DocumentPreviewTab>
          ariaLabel="Document"
          value={activeTab}
          onChange={onActiveTabChange}
          options={[
            { value: "resume", label: "Resume" },
            { value: "coverLetter", label: "Cover letter" }
          ]}
        />
        <button
          type="button"
          onClick={() => window.close()}
          aria-label="Close preview"
          className="w-8 h-8 grid place-items-center rounded-aa-md text-aa-text-secondary hover:bg-aa-neutral-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 border-b border-aa-border bg-aa-surface-subtle">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => wrapSelection("**")}
            disabled={viewMode === "preview"}
            aria-label="Bold"
            className={toolbarBtn}>
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("*")}
            disabled={viewMode === "preview"}
            aria-label="Italic"
            className={toolbarBtn}>
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLink()}
            disabled={viewMode === "preview"}
            aria-label="Insert link"
            className={toolbarBtn}>
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleBullets}
            disabled={viewMode === "preview"}
            aria-label="Toggle bullet list"
            className={toolbarBtn}>
            <List className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-aa-border mx-0.5" />
          <button
            type="button"
            onClick={() => setHeading(1)}
            disabled={viewMode === "preview"}
            aria-label="Heading 1"
            className={toolbarBtn}>
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setHeading(2)}
            disabled={viewMode === "preview"}
            aria-label="Heading 2"
            className={toolbarBtn}>
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setHeading(3)}
            disabled={viewMode === "preview"}
            aria-label="Heading 3"
            className={toolbarBtn}>
            <Heading3 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SegmentedControl<ViewMode>
            ariaLabel="View"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "edit", label: "Edit" },
              { value: "preview", label: "Preview" }
            ]}
          />
          <button
            type="button"
            onClick={() => setContent(original)}
            disabled={!isEdited}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <RotateCcw className="w-3 h-3" />
            Revert
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {viewMode === "edit" ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full h-full min-h-[320px] px-4 py-3.5 bg-aa-surface border border-aa-border rounded-aa-md text-[13px] leading-relaxed text-aa-text-primary font-mono focus:outline-none focus:border-aa-primary transition-colors resize-none"
          />
        ) : (
          <div className="min-h-[320px] h-full overflow-y-auto px-8 py-6 bg-aa-surface border border-aa-border rounded-aa-md">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-aa-border bg-aa-surface-subtle px-5 py-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-aa-text-secondary">
            <Check className="w-3 h-3 text-aa-success" />
            Edits save automatically
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 rounded-aa-sm bg-aa-neutral-100 border border-aa-border px-3.5 py-2 text-[11px] font-semibold text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              Markdown
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 rounded-aa-sm bg-aa-primary px-3.5 py-2 text-[11px] font-semibold text-aa-text-on-primary hover:bg-aa-primary-hover transition-colors">
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>
        {downloadError && (
          <p className="text-[12px] text-aa-error-strong">{downloadError}</p>
        )}
      </div>
    </div>
  )
}

import React from "react"

import type { Language } from "~types/userProfile"

interface LanguageEditorProps {
  languages: Language[]
  onChange: (languages: Language[]) => void
}

const LEVELS = ["Native", "A1", "A2", "B1", "B2", "C1", "C2"]

const levelBadgeClass = (level: string) => {
  if (level === "Native") return "bg-canvas border-canvas-input-border text-ink"
  if (level === "C1" || level === "C2") return "bg-canvas border-canvas-input-border text-ink"
  if (level === "B1" || level === "B2") return "bg-canvas border-canvas-input-border text-ink"
  return "bg-canvas border-canvas-input-border text-ink-secondary"
}

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2"

const inputCls =
  "w-full px-4 py-3 bg-surface border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"

export function LanguageEditor({ languages, onChange }: LanguageEditorProps) {
  const safeLanguages = languages || []
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formLevel, setFormLevel] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const nameInputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = formName.trim()
    if (!trimmed) { setFormError("Language name is required"); return }
    if (!formLevel) { setFormError("Please select a proficiency level"); return }

    const isDuplicate = safeLanguages.some(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase() && l.id !== editingId
    )
    if (isDuplicate) { setFormError(`"${trimmed}" is already in your languages`); return }

    if (editingId) {
      onChange(safeLanguages.map((l) =>
        l.id === editingId ? { ...l, name: trimmed, level: formLevel } : l
      ))
    } else {
      onChange([...safeLanguages, { id: crypto.randomUUID(), name: trimmed, level: formLevel }])
    }
    setFormName(""); setFormLevel(""); setFormError(""); setEditingId(null)
  }

  const handleEdit = (lang: Language) => {
    setEditingId(lang.id)
    setFormName(lang.name)
    setFormLevel(lang.level)
    setFormError("")
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleRemove = (id: string) => {
    onChange(safeLanguages.filter((l) => l.id !== id))
    if (editingId === id) {
      setEditingId(null); setFormName(""); setFormLevel(""); setFormError("")
    }
  }

  const handleCancel = () => {
    setEditingId(null); setFormName(""); setFormLevel(""); setFormError("")
  }

  return (
    <div className="space-y-3">
      {/* Tag cloud */}
      {safeLanguages.length === 0 ? (
        <div className="bg-canvas border-2 border-dashed border-canvas-input-border p-8 text-center">
          <p className="text-ink-secondary mb-4 text-sm">
            No languages added yet. Add the languages you speak to strengthen your profile!
          </p>
          <button
            onClick={() => nameInputRef.current?.focus()}
            className="bg-sidebar-accent text-white px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
            Add Your First Language
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
          {safeLanguages.map((lang) => (
            <span
              key={lang.id}
              className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm font-medium
                          border transition-colors cursor-default
                          ${editingId === lang.id
                            ? "bg-canvas border-ink text-ink"
                            : `${levelBadgeClass(lang.level)} hover:border-ink`}`}>
              <span>{lang.name}</span>
              {lang.level && (
                <span className="text-xs text-ink-muted">· {lang.level}</span>
              )}
              <button
                onClick={() => handleEdit(lang)}
                className="ml-0.5 p-0.5 text-current opacity-50 hover:opacity-100 hover:text-ink transition-all"
                title="Edit language">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleRemove(lang.id)}
                className="p-0.5 text-current opacity-50 hover:opacity-100 hover:text-[#991b1b] transition-all"
                title="Remove language">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Inline add / edit form */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            ref={nameInputRef}
            type="text"
            value={formName}
            onChange={(e) => { setFormName(e.target.value); setFormError("") }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Language (e.g. English, French)"
            className={inputCls} />
        </div>

        <div className="w-32">
          <select
            value={formLevel}
            onChange={(e) => { setFormLevel(e.target.value); setFormError("") }}
            className="w-full px-3 py-3 bg-surface border border-canvas-input-border text-ink text-sm
                       focus:outline-none focus:border-ink transition-colors cursor-pointer">
            <option value="" disabled>Level</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-3 bg-sidebar-accent text-white text-[11px] font-bold uppercase tracking-widest
                     hover:opacity-90 transition-opacity whitespace-nowrap">
          {editingId ? "Update" : "+ Add Language"}
        </button>

        {editingId && (
          <button
            onClick={handleCancel}
            className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors">
            Cancel
          </button>
        )}
      </div>

      {formError && (
        <p className="mt-1.5 text-xs text-[#991b1b]">{formError}</p>
      )}

      {/* Level legend */}
      <p className="text-xs text-ink-muted pt-1">
        <span className="font-medium text-ink-secondary">Levels:</span>{" "}
        Native · A1–A2 Beginner · B1–B2 Intermediate · C1–C2 Advanced
      </p>
    </div>
  )
}

import React from "react"

import type { Language } from "~types/userProfile"

interface LanguageEditorProps {
  languages: Language[]
  onChange: (languages: Language[]) => void
}

const LEVELS = ["Native", "A1", "A2", "B1", "B2", "C1", "C2"]

const levelBadgeClass = (level: string) => {
  if (level === "Native") return "bg-purple-50 border-purple-200 text-purple-800"
  if (level === "C1" || level === "C2") return "bg-emerald-50 border-emerald-200 text-emerald-800"
  if (level === "B1" || level === "B2") return "bg-blue-50 border-blue-200 text-blue-800"
  return "bg-gray-100 border-gray-200 text-gray-700"
}

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
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-gray-600 mb-4 text-sm">
            No languages added yet. Add the languages you speak to strengthen your profile!
          </p>
          <button
            onClick={() => nameInputRef.current?.focus()}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-lg
                       hover:bg-purple-700 transition-all hover:shadow-md font-medium">
            Add Your First Language
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
          {safeLanguages.map((lang) => (
            <span
              key={lang.id}
              className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium
                          border transition-colors cursor-default
                          ${editingId === lang.id
                            ? "bg-purple-100 border-purple-400 text-purple-800"
                            : `${levelBadgeClass(lang.level)} hover:border-purple-300`}`}>
              <span>{lang.name}</span>
              {lang.level && (
                <span className="text-xs opacity-70">· {lang.level}</span>
              )}
              <button
                onClick={() => handleEdit(lang)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-purple-200 text-current opacity-50 hover:opacity-100 transition-all"
                title="Edit language">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleRemove(lang.id)}
                className="p-0.5 rounded-full hover:bg-red-100 text-current opacity-50 hover:opacity-100 hover:text-red-600 transition-all"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        </div>

        <div className="w-32">
          <select
            value={formLevel}
            onChange={(e) => { setFormLevel(e.target.value); setFormError("") }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       text-gray-700 cursor-pointer">
            <option value="" disabled>Level</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium
                     hover:bg-purple-700 transition-colors whitespace-nowrap">
          {editingId ? "Update" : "+ Add Language"}
        </button>

        {editingId && (
          <button
            onClick={handleCancel}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancel
          </button>
        )}
      </div>

      {formError && <p className="mt-1.5 text-xs text-red-600">{formError}</p>}

      {/* Level legend */}
      <p className="text-xs text-gray-400 pt-1">
        <span className="font-medium text-gray-500">Levels:</span>{" "}
        Native · A1–A2 Beginner · B1–B2 Intermediate · C1–C2 Advanced
      </p>
    </div>
  )
}

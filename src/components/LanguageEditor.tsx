import React from "react"

import type { Language } from "~types/userProfile"

interface LanguageEditorProps {
  languages: Language[]
  onChange: (languages: Language[]) => void
}

const LEVEL_SUGGESTIONS = ["Native", "Proficient (C2)", "Proficient (C1)", "Upper-Intermediate (B2)", "Professional (B1)", "Elementary (A2)"]

export function LanguageEditor({ languages, onChange }: LanguageEditorProps) {
  const safeLanguages = languages || []

  const addLanguage = () => {
    onChange([
      ...safeLanguages,
      { id: crypto.randomUUID(), name: "", level: "" }
    ])
  }

  const updateLanguage = (id: string, field: keyof Language, value: string) => {
    onChange(safeLanguages.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const removeLanguage = (id: string) => {
    onChange(safeLanguages.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-4">
      {safeLanguages.map((lang) => (
        <div key={lang.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language *
              </label>
              <input
                type="text"
                value={lang.name}
                onChange={(e) => updateLanguage(lang.id, "name", e.target.value)}
                placeholder="e.g., English"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level *
              </label>
              <input
                type="text"
                value={lang.level}
                onChange={(e) => updateLanguage(lang.id, "level", e.target.value)}
                placeholder="e.g., Native, Proficient (C1)"
                list={`levels-${lang.id}`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <datalist id={`levels-${lang.id}`}>
                {LEVEL_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <button
            onClick={() => removeLanguage(lang.id)}
            className="text-sm text-red-600 hover:text-red-800 transition-colors">
            Remove
          </button>
        </div>
      ))}

      <button
        onClick={addLanguage}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg
                 text-gray-600 hover:border-purple-400 hover:text-purple-600
                 transition-colors font-medium">
        + Add Language
      </button>
    </div>
  )
}

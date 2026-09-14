import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { OUTLINE_BUTTON_CLASS } from "~constants/options"
import type { Language } from "~types/userProfile"

interface LanguageEditorProps {
  languages: Language[]
  onChange: (languages: Language[]) => void
}

const LEVELS = ["Native", "A1", "A2", "B1", "B2", "C1", "C2"]

export function LanguageEditor({ languages, onChange }: LanguageEditorProps) {
  const safeLanguages = languages || []
  const [draft, setDraft] = useState<Language | null>(null)
  const nameRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (draft) {
      nameRefs.current[draft.id]?.focus()
    }
  }, [draft?.id])

  const displayLanguages = draft ? [...safeLanguages, draft] : safeLanguages

  const updateLanguage = (id: string, updates: Partial<Language>) => {
    if (draft && draft.id === id) {
      const updated = { ...draft, ...updates }
      if (updated.name.trim()) {
        onChange([...safeLanguages, updated])
        setDraft(null)
      } else {
        setDraft(updated)
      }
      return
    }
    onChange(safeLanguages.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  const handleAdd = () => {
    setDraft({ id: crypto.randomUUID(), name: "", level: "B1" })
  }

  const handleRemove = (id: string) => {
    if (draft && draft.id === id) {
      setDraft(null)
      return
    }
    onChange(safeLanguages.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-4">
      {displayLanguages.length === 0 ? (
        <div className="rounded-aa-md border border-aa-border bg-aa-neutral-50 p-8 text-center">
          <p className="text-sm text-aa-text-secondary">
            No languages added yet. Add the languages you speak to strengthen
            your profile!
          </p>
        </div>
      ) : (
        displayLanguages.map((lang) => (
          <div
            key={lang.id}
            className="flex items-center gap-3 rounded-aa-md border border-aa-border bg-aa-surface px-[14px] py-3">
            <input
              ref={(el) => {
                nameRefs.current[lang.id] = el
              }}
              type="text"
              value={lang.name}
              onChange={(e) =>
                updateLanguage(lang.id, { name: e.target.value })
              }
              placeholder="Language (e.g. English, French)"
              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-sm font-semibold text-aa-text-primary placeholder:font-normal placeholder:text-aa-text-secondary focus:outline-none"
            />

            <div className="relative shrink-0">
              <select
                value={lang.level}
                onChange={(e) =>
                  updateLanguage(lang.id, { level: e.target.value })
                }
                className="appearance-none w-[130px] bg-aa-surface border border-aa-border rounded-aa-md pl-3 pr-8 py-[7px] text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary cursor-pointer">
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-aa-neutral-500" />
            </div>

            <button
              onClick={() => handleRemove(lang.id)}
              className="shrink-0 text-aa-neutral-400 hover:text-aa-error-strong transition-colors"
              title="Remove language">
              <Trash2 className="w-[15px] h-[15px]" />
            </button>
          </div>
        ))
      )}

      <button
        onClick={handleAdd}
        className={`w-full flex items-center justify-center gap-2 ${OUTLINE_BUTTON_CLASS}`}>
        <Plus className="w-[15px] h-[15px]" />
        Add language
      </button>

      <p className="text-xs text-aa-text-secondary pt-1">
        <span className="font-medium text-aa-text-primary">Levels:</span> Native
        · A1–A2 Beginner · B1–B2 Intermediate · C1–C2 Advanced
      </p>
    </div>
  )
}

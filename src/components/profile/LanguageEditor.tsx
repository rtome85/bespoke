import { ChevronDown, Plus } from "lucide-react"
import { useState } from "react"

import { ConfirmDialog } from "~components/common/ConfirmDialog"
import type { Language } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { ProfileEntryModal } from "./ProfileEntryModal"

interface LanguageEditorProps {
  languages: Language[]
  onChange: (languages: Language[]) => void
}

const LEVELS = ["Native", "A1", "A2", "B1", "B2", "C1", "C2"]

export function LanguageEditor({ languages, onChange }: LanguageEditorProps) {
  const safeLanguages = languages || []
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null)
  // Index of the row being edited; null while the dialog adds a new entry.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  // Index of the row awaiting delete confirmation.
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null
  )

  const addLanguage = () => {
    setEditingIndex(null)
    setEditingLanguage({ id: crypto.randomUUID(), name: "", level: "B1" })
  }

  const editLanguage = (index: number) => {
    setEditingIndex(index)
    setEditingLanguage({ ...safeLanguages[index] })
  }

  const closeEditingLanguage = () => {
    setEditingLanguage(null)
    setEditingIndex(null)
  }

  const saveEditingLanguage = () => {
    if (!editingLanguage) return
    if (!editingLanguage.name.trim()) {
      alert("Language name is required")
      return
    }
    onChange(
      editingIndex === null
        ? [...safeLanguages, editingLanguage]
        : safeLanguages.map((lang, i) =>
            i === editingIndex ? editingLanguage : lang
          )
    )
    closeEditingLanguage()
  }

  const confirmRemoveLanguage = () => {
    if (pendingDeleteIndex === null) return
    onChange(safeLanguages.filter((_, i) => i !== pendingDeleteIndex))
    setPendingDeleteIndex(null)
  }

  const pendingDeleteLanguage =
    pendingDeleteIndex === null ? null : safeLanguages[pendingDeleteIndex]

  return (
    <section className="space-y-2.5">
      <div className="aa-list-section-header">
        <h2 className="aa-card-heading tracking-aa-tighter-2">Languages</h2>
        <button
          onClick={addLanguage}
          className="aa-btn-outline inline-flex items-center gap-aa-2">
          <Plus className="w-aa-px-15 h-aa-px-15" />
          Add language
        </button>
      </div>

      {editingLanguage && (
        <ProfileEntryModal
          title={editingIndex === null ? "Add new language" : "Edit language"}
          saveLabel="Save language"
          onSave={saveEditingLanguage}
          onCancel={closeEditingLanguage}>
          <div className="space-y-4">
            <div>
              <label className="aa-label">Language *</label>
              <input
                type="text"
                value={editingLanguage.name}
                onChange={(e) =>
                  setEditingLanguage({
                    ...editingLanguage,
                    name: e.target.value
                  })
                }
                placeholder="e.g. English, French"
                className="aa-input"
              />
            </div>

            <div>
              <label className="aa-label">Proficiency level</label>
              <div className="relative">
                <select
                  value={editingLanguage.level}
                  onChange={(e) =>
                    setEditingLanguage({
                      ...editingLanguage,
                      level: e.target.value
                    })
                  }
                  className="aa-input appearance-none pr-8 cursor-pointer">
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-aa-neutral-500" />
              </div>
              <p className="aa-hint">
                Native · A1–A2 Beginner · B1–B2 Intermediate · C1–C2 Advanced
              </p>
            </div>
          </div>
        </ProfileEntryModal>
      )}

      {pendingDeleteLanguage && (
        <ConfirmDialog
          title="Delete language?"
          message={`${pendingDeleteLanguage.name ? `"${pendingDeleteLanguage.name}"` : "This language"} will be removed from your profile. This can't be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={confirmRemoveLanguage}
          onCancel={() => setPendingDeleteIndex(null)}
        />
      )}

      <div className="aa-card-base">
        <ArrayInput
          items={safeLanguages}
          getItemKey={(lang) => lang.id}
          onAdd={addLanguage}
          onEdit={editLanguage}
          onRemove={setPendingDeleteIndex}
          renderSummary={(lang) => (
            <div className="flex flex-1 items-center justify-between min-w-0 gap-aa-4">
              <p className="text-sm font-semibold text-aa-text-primary truncate">
                {lang.name || (
                  <span className="italic text-aa-text-secondary">
                    Untitled language
                  </span>
                )}
              </p>
              <span className="shrink-0 text-aa-caption font-medium text-aa-neutral-500">
                {lang.level}
              </span>
            </div>
          )}
          emptyMessage="No languages added yet. Add the languages you speak to strengthen your profile!"
          addButtonText="Language"
          flush
        />
      </div>
    </section>
  )
}

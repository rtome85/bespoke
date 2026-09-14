import { Plus, X } from "lucide-react"
import { useRef, useState } from "react"

import { ACCENT_BUTTON_CLASS } from "~constants/options"
import type { Skill } from "~types/userProfile"

interface SkillEditorProps {
  skills: Skill[]
  onChange: (skills: Skill[]) => void
}

const validateSkill = (skill: Skill): string[] => {
  const errors = []
  if (!skill.name.trim()) errors.push("Skill name is required")
  if (skill.yearsOfExperience <= 0)
    errors.push("Years of experience must be greater than 0")
  if (skill.yearsOfExperience > 50)
    errors.push("Years of experience seems unrealistic")
  return errors
}

export function SkillEditor({ skills, onChange }: SkillEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formYears, setFormYears] = useState(1)
  const [formError, setFormError] = useState("")
  const nameInputRef = useRef<HTMLInputElement>(null)

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    onChange(
      skills.map((skill) =>
        skill.id === id ? { ...skill, ...updates } : skill
      )
    )
  }

  const removeSkill = (id: string) => {
    onChange(skills.filter((skill) => skill.id !== id))
  }

  const handleSubmit = () => {
    const trimmed = formName.trim()
    if (!trimmed) {
      setFormError("Skill name is required")
      return
    }
    if (formYears <= 0 || formYears > 50) {
      setFormError("Years must be 1–50")
      return
    }
    const isDuplicate = skills.some(
      (s) =>
        s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== editingId
    )
    if (isDuplicate) {
      setFormError(`"${trimmed}" is already in your skills`)
      return
    }
    if (editingId) {
      updateSkill(editingId, { name: trimmed, yearsOfExperience: formYears })
    } else {
      onChange([
        ...skills,
        { id: crypto.randomUUID(), name: trimmed, yearsOfExperience: formYears }
      ])
    }
    setFormName("")
    setFormYears(1)
    setFormError("")
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormName("")
    setFormYears(1)
    setFormError("")
  }

  const handleEditSkill = (skill: Skill) => {
    setEditingId(skill.id)
    setFormName(skill.name)
    setFormYears(skill.yearsOfExperience)
    setFormError("")
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleRemoveSkill = (id: string) => {
    removeSkill(id)
    if (editingId === id) {
      setEditingId(null)
      setFormName("")
      setFormYears(1)
      setFormError("")
    }
  }

  return (
    <div className="space-y-3">
      {skills.length === 0 ? (
        <div className="rounded-aa-md border border-aa-border bg-aa-neutral-50 p-8 text-center">
          <p className="text-sm text-aa-text-secondary mb-4">
            No skills added yet. Add your skills to showcase your expertise!
          </p>
          <button
            onClick={() => nameInputRef.current?.focus()}
            className={ACCENT_BUTTON_CLASS}>
            Add your first skill
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mb-4">
          {skills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => handleEditSkill(skill)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleEditSkill(skill)}
              title="Edit skill"
              className={`inline-flex items-center gap-2 rounded-aa-pill border px-3 py-2 cursor-pointer transition-colors
                ${
                  editingId === skill.id
                    ? "bg-aa-primary-soft border-aa-primary"
                    : "bg-aa-neutral-50 border-aa-border hover:border-aa-neutral-300"
                }`}>
              <span className="text-[13px] font-medium text-aa-text-primary">
                {skill.name}
              </span>
              <span className="text-[11px] text-aa-text-secondary">
                {skill.yearsOfExperience}y
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveSkill(skill.id)
                }}
                title="Remove skill"
                className="text-aa-neutral-400 hover:text-aa-error-strong transition-colors">
                <X className="w-[13px] h-[13px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <input
            ref={nameInputRef}
            type="text"
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value)
              setFormError("")
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Skill name (e.g. React, Python)"
            className="w-full px-3 py-[10px] bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm focus:outline-none focus:border-aa-primary transition-colors"
          />
        </div>
        <div className="w-[90px]">
          <input
            type="number"
            min="1"
            max="50"
            value={formYears}
            onChange={(e) => setFormYears(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-[10px] bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm text-center focus:outline-none focus:border-aa-primary transition-colors"
          />
          <p className="text-[11px] text-aa-text-secondary text-center mt-0.5">
            years
          </p>
        </div>
        <button
          onClick={handleSubmit}
          className={`flex items-center gap-2 whitespace-nowrap ${ACCENT_BUTTON_CLASS}`}>
          <Plus className="w-[15px] h-[15px]" />
          {editingId ? "Update" : "Add"}
        </button>
        {editingId && (
          <button
            onClick={handleCancelEdit}
            className="px-3 py-[9px] text-[13px] font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors">
            Cancel
          </button>
        )}
      </div>
      {formError && (
        <p className="mt-1.5 text-xs text-aa-error-strong">{formError}</p>
      )}
    </div>
  )
}

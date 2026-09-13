import React from "react"

import type { Skill } from "~types/userProfile"

interface SkillEditorProps {
  skills: Skill[]
  onChange: (skills: Skill[]) => void
}

const validateSkill = (skill: Skill): string[] => {
  const errors = []
  if (!skill.name.trim()) errors.push("Skill name is required")
  if (skill.yearsOfExperience <= 0) errors.push("Years of experience must be greater than 0")
  if (skill.yearsOfExperience > 50) errors.push("Years of experience seems unrealistic")
  return errors
}

export function SkillEditor({ skills, onChange }: SkillEditorProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formYears, setFormYears] = React.useState(1)
  const [formError, setFormError] = React.useState("")
  const nameInputRef = React.useRef<HTMLInputElement>(null)

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    onChange(skills.map((skill) => (skill.id === id ? { ...skill, ...updates } : skill)))
  }

  const removeSkill = (id: string) => {
    onChange(skills.filter((skill) => skill.id !== id))
  }

  const handleSubmit = () => {
    const trimmed = formName.trim()
    if (!trimmed) { setFormError("Skill name is required"); return }
    if (formYears <= 0 || formYears > 50) { setFormError("Years must be 1–50"); return }
    const isDuplicate = skills.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== editingId
    )
    if (isDuplicate) { setFormError(`"${trimmed}" is already in your skills`); return }
    if (editingId) {
      updateSkill(editingId, { name: trimmed, yearsOfExperience: formYears })
    } else {
      onChange([...skills, { id: crypto.randomUUID(), name: trimmed, yearsOfExperience: formYears }])
    }
    setFormName(""); setFormYears(1); setFormError(""); setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null); setFormName(""); setFormYears(1); setFormError("")
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
      setEditingId(null); setFormName(""); setFormYears(1); setFormError("")
    }
  }

  return (
    <div className="space-y-3">
      {skills.length === 0 ? (
        <div className="border-2 border-dashed border-canvas-input-border p-8 text-center">
          <p className="text-ink-secondary text-sm mb-4">
            No skills added yet. Add your skills to showcase your expertise!
          </p>
          <button
            onClick={() => nameInputRef.current?.focus()}
            className="px-5 py-2.5 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity">
            Add Your First Skill
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
          {skills.map((skill) => (
            <span
              key={skill.id}
              className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm font-medium border transition-colors cursor-default
                ${editingId === skill.id
                  ? "bg-[#fdf5f2] border-sidebar-accent text-ink"
                  : "bg-canvas border-canvas-input-border text-ink hover:border-ink-secondary"}`}>
              <span>{skill.name}</span>
              <span className="text-xs text-ink-muted">· {skill.yearsOfExperience}y</span>
              <button
                onClick={() => handleEditSkill(skill)}
                className="ml-0.5 p-0.5 hover:bg-canvas-divide text-ink-muted hover:text-ink transition-colors"
                title="Edit skill">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleRemoveSkill(skill.id)}
                className="p-0.5 hover:bg-[#fef2f2] text-ink-muted hover:text-[#991b1b] transition-colors"
                title="Remove skill">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            ref={nameInputRef}
            type="text"
            value={formName}
            onChange={(e) => { setFormName(e.target.value); setFormError("") }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Skill name (e.g. React, Python)"
            className="w-full px-3 py-2 bg-surface border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"
          />
        </div>
        <div className="w-20">
          <input
            type="number" min="1" max="50"
            value={formYears}
            onChange={(e) => setFormYears(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 bg-surface border border-canvas-input-border text-ink text-sm text-center focus:outline-none focus:border-ink transition-colors"
          />
          <p className="text-[11px] text-ink-muted text-center mt-0.5">yrs</p>
        </div>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap">
          {editingId ? "Update" : "+ Add Skill"}
        </button>
        {editingId && (
          <button
            onClick={handleCancelEdit}
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors">
            Cancel
          </button>
        )}
      </div>
      {formError && <p className="mt-1.5 text-xs text-[#991b1b]">{formError}</p>}
    </div>
  )
}

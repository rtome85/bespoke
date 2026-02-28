import React from "react"

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

  const handleAddFirstSkill = () => {
    nameInputRef.current?.focus()
  }

  return (
    <div className="space-y-3">
      {skills.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-gray-600 mb-4 text-sm">
            No skills added yet. Add your skills to showcase your expertise!
          </p>
          <button
            onClick={handleAddFirstSkill}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-lg
                     hover:bg-purple-700 transition-all hover:shadow-md
                     font-medium">
            Add Your First Skill
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
          {skills.map((skill) => (
            <span
              key={skill.id}
              className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium
                          border transition-colors cursor-default
                          ${editingId === skill.id
                            ? "bg-purple-100 border-purple-400 text-purple-800"
                            : "bg-gray-100 border-gray-200 text-gray-800 hover:border-purple-300"}`}>
              <span>{skill.name}</span>
              <span className="text-xs text-gray-500">· {skill.yearsOfExperience}y</span>
              <button
                onClick={() => handleEditSkill(skill)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-purple-200 text-gray-400 hover:text-purple-700 transition-colors"
                title="Edit skill">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleRemoveSkill(skill.id)}
                className="p-0.5 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        </div>
        <div className="w-20">
          <input
            type="number" min="1" max="50"
            value={formYears}
            onChange={(e) => setFormYears(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
          <p className="text-xs text-gray-400 text-center mt-0.5">yrs</p>
        </div>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium
                     hover:bg-purple-700 transition-colors whitespace-nowrap">
          {editingId ? "Update" : "+ Add Skill"}
        </button>
        {editingId && (
          <button
            onClick={handleCancelEdit}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancel
          </button>
        )}
      </div>
      {formError && <p className="mt-1.5 text-xs text-red-600">{formError}</p>}
    </div>
  )
}

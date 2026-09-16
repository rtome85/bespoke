import { Plus } from "lucide-react"
import { useState } from "react"

import type { Education } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { DatePicker } from "./DatePicker"
import { ProfileEntryModal } from "./ProfileEntryModal"

interface EducationEditorProps {
  education: Education[]
  onChange: (education: Education[]) => void
}

const validateEducation = (edu: Education): string[] => {
  const errors = []
  if (!edu) return errors
  if (!edu.degree?.trim()) errors.push("Degree is required")
  if (!edu.institution?.trim()) errors.push("Institution is required")
  if (!edu.startDate) errors.push("Start date is required")
  return errors
}

export function EducationEditor({ education, onChange }: EducationEditorProps) {
  const [editingEducation, setEditingEducation] = useState<Education | null>(
    null
  )
  // Index of the row being edited; null while the dialog adds a new entry.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const safeEducation = education || []

  const addEducation = () => {
    const newEducation: Education = {
      id: crypto.randomUUID(),
      degree: "",
      institution: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: null,
      description: ""
    }
    setEditingIndex(null)
    setEditingEducation(newEducation)
  }

  const editEducation = (index: number) => {
    setEditingIndex(index)
    setEditingEducation({ ...safeEducation[index] })
  }

  const closeEditingEducation = () => {
    setEditingEducation(null)
    setEditingIndex(null)
  }

  const removeEducation = (index: number) => {
    const newEducation = safeEducation.filter((_, i) => i !== index)
    onChange(newEducation)
  }

  const saveEditingEducation = () => {
    if (editingEducation) {
      const errors = validateEducation(editingEducation)
      if (errors.length === 0) {
        onChange(
          editingIndex === null
            ? [...safeEducation, editingEducation]
            : safeEducation.map((edu, i) =>
                i === editingIndex ? editingEducation : edu
              )
        )
        closeEditingEducation()
      } else {
        alert(errors.join("\n"))
      }
    }
  }

  const renderEducationItem = (
    edu: Education,
    index: number,
    onUpdate: (edu: Education) => void
  ) => {
    const errors = validateEducation(edu)
    // An untouched draft is not yet wrong: hold the required-field errors
    // back until something has been entered, so the add dialog doesn't open
    // already flagging three problems.
    const isBlank =
      !edu.degree?.trim() &&
      !edu.institution?.trim() &&
      !edu.fieldOfStudy?.trim() &&
      !edu.startDate &&
      !edu.endDate &&
      !edu.description?.trim()
    const hasErrors = errors.length > 0 && !isBlank
    const isCurrentPosition = edu.endDate === null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="aa-label">Degree *</label>
            <input
              type="text"
              value={edu.degree}
              onChange={(e) => onUpdate({ ...edu, degree: e.target.value })}
              placeholder="e.g., Bachelor of Science"
              className={hasErrors && !edu.degree ? "aa-input-error" : "aa-input"}
            />
          </div>

          <div>
            <label className="aa-label">Institution *</label>
            <input
              type="text"
              value={edu.institution}
              onChange={(e) =>
                onUpdate({ ...edu, institution: e.target.value })
              }
              placeholder="e.g., University of California"
              className={
                hasErrors && !edu.institution ? "aa-input-error" : "aa-input"
              }
            />
          </div>
        </div>

        <div>
          <label className="aa-label">Field of Study</label>
          <input
            type="text"
            value={edu.fieldOfStudy || ""}
            onChange={(e) => onUpdate({ ...edu, fieldOfStudy: e.target.value })}
            placeholder="e.g., Computer Science"
            className="aa-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Start Date"
            value={edu.startDate}
            onChange={(date) => onUpdate({ ...edu, startDate: date || "" })}
            required
          />

          <DatePicker
            label="End Date"
            value={edu.endDate}
            onChange={(date) => onUpdate({ ...edu, endDate: date })}
            showCurrentPosition
            currentPosition={isCurrentPosition}
            onCurrentPositionChange={(isCurrent) =>
              onUpdate({ ...edu, endDate: isCurrent ? null : edu.endDate })
            }
          />
        </div>

        <div>
          <label className="aa-label">Description</label>
          <textarea
            value={edu.description || ""}
            onChange={(e) => onUpdate({ ...edu, description: e.target.value })}
            placeholder="Describe your coursework, achievements, or relevant projects..."
            rows={3}
            maxLength={300}
            className="aa-input resize-none"
          />
          <p className="mt-1 text-aa-11 text-aa-text-secondary">
            {(edu.description || "").length}/300 characters
          </p>
        </div>

        {hasErrors && (
          <div className="aa-message-error">
            {errors.map((error, i) => (
              <p key={i} className="text-sm">
                • {error}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="space-y-2.5">
      <div className="aa-list-section-header">
        <h2 className="aa-card-heading tracking-aa-tighter-2">
          Degrees &amp; programmes
        </h2>
        <button
          onClick={addEducation}
          className="aa-btn-outline inline-flex items-center gap-aa-2">
          <Plus className="w-aa-px-15 h-aa-px-15" />
          Add education
        </button>
      </div>

      {editingEducation && (
        <ProfileEntryModal
          title={editingIndex === null ? "Add new education" : "Edit education"}
          saveLabel="Save education"
          onSave={saveEditingEducation}
          onCancel={closeEditingEducation}>
          {renderEducationItem(editingEducation, 0, setEditingEducation)}
        </ProfileEntryModal>
      )}

      <div className="aa-card-base">
        <ArrayInput
          items={safeEducation}
          getItemKey={(edu) => edu.id}
          onAdd={addEducation}
          onEdit={editEducation}
          onRemove={removeEducation}
          renderSummary={(edu) => {
            const fmt = (iso: string | null) => {
              if (!iso) return "Present"
              const [y, m] = iso.split("-")
              return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`
            }
            return (
              <div className="flex flex-1 items-center justify-between min-w-0 gap-aa-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-aa-text-primary truncate">
                    {edu.degree
                      ? <>{edu.degree}{edu.fieldOfStudy && <span className="font-normal text-aa-text-secondary"> · {edu.fieldOfStudy}</span>}</>
                      : <span className="italic text-aa-text-secondary">Untitled degree</span>}
                  </p>
                  <p className="text-xs text-aa-text-secondary truncate mt-0.5">
                    {edu.institution || "—"}
                  </p>
                </div>
                {edu.startDate && (
                  <span className="shrink-0 text-aa-caption font-medium text-aa-neutral-500">
                    {fmt(edu.startDate)} – {fmt(edu.endDate)}
                  </span>
                )}
              </div>
            )
          }}
          emptyMessage="No education added yet. Add your educational background to get started!"
          addButtonText="Education"
          flush
        />
      </div>
    </section>
  )
}

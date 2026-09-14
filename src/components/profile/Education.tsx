import { useState } from "react"

import {
  ACCENT_BUTTON_CLASS,
  ERROR_MESSAGE_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  SECONDARY_BUTTON_CLASS
} from "~constants/options"
import type { Education } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { DatePicker } from "./DatePicker"

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

const labelCls = LABEL_CLASS

const inputCls = INPUT_CLASS

const inputErrorCls =
  "w-full px-3 py-[10px] bg-aa-surface border border-aa-error text-aa-text-primary text-sm rounded-aa-md focus:outline-none focus:border-aa-error transition-colors"

export function EducationEditor({ education, onChange }: EducationEditorProps) {
  const [editingEducation, setEditingEducation] = useState<Education | null>(
    null
  )
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
    setEditingEducation(newEducation)
  }

  const updateEducation = (index: number, edu: Education) => {
    const newEducation = [...safeEducation]
    newEducation[index] = edu
    onChange(newEducation)
  }

  const removeEducation = (index: number) => {
    const newEducation = safeEducation.filter((_, i) => i !== index)
    onChange(newEducation)
  }

  const saveEditingEducation = () => {
    if (editingEducation) {
      const errors = validateEducation(editingEducation)
      if (errors.length === 0) {
        onChange([...safeEducation, editingEducation])
        setEditingEducation(null)
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
    const hasErrors = errors.length > 0
    const isCurrentPosition = edu.endDate === null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Degree *</label>
            <input
              type="text"
              value={edu.degree}
              onChange={(e) => onUpdate({ ...edu, degree: e.target.value })}
              placeholder="e.g., Bachelor of Science"
              className={hasErrors && !edu.degree ? inputErrorCls : inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Institution *</label>
            <input
              type="text"
              value={edu.institution}
              onChange={(e) =>
                onUpdate({ ...edu, institution: e.target.value })
              }
              placeholder="e.g., University of California"
              className={
                hasErrors && !edu.institution ? inputErrorCls : inputCls
              }
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Field of Study</label>
          <input
            type="text"
            value={edu.fieldOfStudy || ""}
            onChange={(e) => onUpdate({ ...edu, fieldOfStudy: e.target.value })}
            placeholder="e.g., Computer Science"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Start Date *"
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
          <label className={labelCls}>Description</label>
          <textarea
            value={edu.description || ""}
            onChange={(e) => onUpdate({ ...edu, description: e.target.value })}
            placeholder="Describe your coursework, achievements, or relevant projects..."
            rows={3}
            maxLength={300}
            className={`${inputCls} resize-none`}
          />
          <p className="mt-1 text-[11px] text-aa-text-secondary">
            {(edu.description || "").length}/300 characters
          </p>
        </div>

        {hasErrors && (
          <div className={ERROR_MESSAGE_CLASS}>
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
    <div>
      {editingEducation && (
        <div className="rounded-aa-md border border-aa-border bg-aa-neutral-50 p-aa-4 mb-6">
          <h3 className="text-sm font-semibold text-aa-text-primary mb-4">
            Add new education
          </h3>
          {renderEducationItem(editingEducation, 0, setEditingEducation)}
          <div className="flex gap-3 mt-4">
            <button onClick={saveEditingEducation} className={ACCENT_BUTTON_CLASS}>
              Save education
            </button>
            <button
              onClick={() => setEditingEducation(null)}
              className={SECONDARY_BUTTON_CLASS}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <ArrayInput
        items={safeEducation}
        getItemKey={(edu) => edu.id}
        onAdd={addEducation}
        onUpdate={updateEducation}
        onRemove={removeEducation}
        renderItem={renderEducationItem}
        renderSummary={(edu) => {
          const fmt = (iso: string | null) => {
            if (!iso) return "Present"
            const [y, m] = iso.split("-")
            return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`
          }
          return (
            <div className="flex flex-1 items-center justify-between min-w-0 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-aa-text-primary truncate leading-tight">
                  {edu.degree
                    ? <>{edu.degree}{edu.fieldOfStudy && <span className="font-normal text-aa-text-secondary"> · {edu.fieldOfStudy}</span>}</>
                    : <span className="italic text-aa-text-disabled">Untitled degree</span>}
                </p>
                <p className="text-xs text-aa-text-secondary truncate mt-0.5">
                  {edu.institution || "—"}
                </p>
              </div>
              {edu.startDate && (
                <span className="shrink-0 text-xs text-aa-text-secondary">
                  {fmt(edu.startDate)} – {fmt(edu.endDate)}
                </span>
              )}
            </div>
          )
        }}
        emptyMessage="No education added yet. Add your educational background to get started!"
        addButtonText="Education"
      />
    </div>
  )
}

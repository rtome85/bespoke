import React, { useState } from "react"

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

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2"

const inputCls =
  "w-full px-4 py-3 bg-white border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"

const inputErrorCls =
  "w-full px-4 py-3 bg-white border border-[#fca5a5] text-ink text-sm focus:outline-none focus:border-[#991b1b] transition-colors"

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
            className="w-full px-4 py-3 bg-white border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors resize-none"
          />
          <p className="mt-1 text-[11px] text-ink-secondary">
            {(edu.description || "").length}/300 characters
          </p>
        </div>

        {hasErrors && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b] px-4 py-3">
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
        <div className="bg-canvas border-2 border-ink p-4 mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink mb-4">
            Add New Education
          </h3>
          {renderEducationItem(editingEducation, 0, setEditingEducation)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingEducation}
              className="px-4 py-2 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity">
              Save Education
            </button>
            <button
              onClick={() => setEditingEducation(null)}
              className="px-4 py-2 bg-canvas border border-canvas-input-border text-ink text-[11px] font-semibold uppercase tracking-widest cursor-pointer hover:border-ink transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ArrayInput
        items={safeEducation}
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
            <div className="flex flex-1 items-center justify-between min-w-0 pr-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate leading-tight">
                  {edu.degree
                    ? <>{edu.degree}{edu.fieldOfStudy && <span className="font-normal text-ink-secondary"> · {edu.fieldOfStudy}</span>}</>
                    : <span className="italic text-ink-muted">Untitled degree</span>}
                </p>
                <p className="text-xs text-ink-secondary truncate mt-0.5">
                  {edu.institution || "—"}
                </p>
              </div>
              {edu.startDate && (
                <span className="ml-4 shrink-0 text-xs text-ink-muted">
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

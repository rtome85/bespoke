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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Degree *
            </label>
            <input
              type="text"
              value={edu.degree}
              onChange={(e) => onUpdate({ ...edu, degree: e.target.value })}
              placeholder="e.g., Bachelor of Science"
              className={`w-full px-4 py-3 border rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                         hasErrors && !edu.degree
                           ? "border-red-300"
                           : "border-gray-300"
                       }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institution *
            </label>
            <input
              type="text"
              value={edu.institution}
              onChange={(e) =>
                onUpdate({ ...edu, institution: e.target.value })
              }
              placeholder="e.g., University of California"
              className={`w-full px-4 py-3 border rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                         hasErrors && !edu.institution
                           ? "border-red-300"
                           : "border-gray-300"
                       }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field of Study
          </label>
          <input
            type="text"
            value={edu.fieldOfStudy || ""}
            onChange={(e) => onUpdate({ ...edu, fieldOfStudy: e.target.value })}
            placeholder="e.g., Computer Science"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={edu.description || ""}
            onChange={(e) => onUpdate({ ...edu, description: e.target.value })}
            placeholder="Describe your coursework, achievements, or relevant projects..."
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     resize-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            {(edu.description || "").length}/300 characters
          </p>
        </div>

        {hasErrors && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">
            Add New Education
          </h3>
          {renderEducationItem(editingEducation, 0, setEditingEducation)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingEducation}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 transition-colors font-medium">
              Save Education
            </button>
            <button
              onClick={() => setEditingEducation(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                       hover:bg-gray-300 transition-colors font-medium">
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
                <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                  {edu.degree
                    ? <>{edu.degree}{edu.fieldOfStudy && <span className="font-normal text-gray-500"> · {edu.fieldOfStudy}</span>}</>
                    : <span className="italic text-gray-400">Untitled degree</span>}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {edu.institution || "—"}
                </p>
              </div>
              {edu.startDate && (
                <span className="ml-4 shrink-0 text-xs text-gray-400">
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

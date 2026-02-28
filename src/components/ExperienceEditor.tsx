import React, { useState } from "react"

import type { WorkExperience } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { DatePicker } from "./DatePicker"

interface ExperienceEditorProps {
  experiences: WorkExperience[]
  onChange: (experiences: WorkExperience[]) => void
}

const validateExperience = (exp: WorkExperience): string[] => {
  const errors = []
  if (!exp.jobTitle.trim()) errors.push("Job title is required")
  if (!exp.company.trim()) errors.push("Company is required")
  if (!exp.startDate) errors.push("Start date is required")
  if (exp.endDate && exp.endDate <= exp.startDate)
    errors.push("End date must be after start date")
  if (exp.achievements.length === 0)
    errors.push("At least one achievement is required")
  return errors
}

export function ExperienceEditor({
  experiences,
  onChange
}: ExperienceEditorProps) {
  const [editingExperience, setEditingExperience] =
    useState<WorkExperience | null>(null)

  const addExperience = () => {
    const newExperience: WorkExperience = {
      id: crypto.randomUUID(),
      jobTitle: "",
      company: "",
      startDate: "",
      endDate: null,
      achievements: [""]
    }
    setEditingExperience(newExperience)
  }

  const updateExperience = (index: number, experience: WorkExperience) => {
    const newExperiences = [...experiences]
    newExperiences[index] = experience
    onChange(newExperiences)
  }

  const removeExperience = (index: number) => {
    const newExperiences = experiences.filter((_, i) => i !== index)
    onChange(newExperiences)
  }

  const saveEditingExperience = () => {
    if (editingExperience) {
      const errors = validateExperience(editingExperience)
      if (errors.length === 0) {
        onChange([...experiences, editingExperience])
        setEditingExperience(null)
      } else {
        alert(errors.join("\n"))
      }
    }
  }

  const renderExperienceItem = (
    experience: WorkExperience,
    index: number,
    onUpdate: (exp: WorkExperience) => void
  ) => {
    const errors = validateExperience(experience)
    const hasErrors = errors.length > 0
    const isCurrentPosition = experience.endDate === null

    const updateAchievement = (achievementIndex: number, value: string) => {
      const newAchievements = [...experience.achievements]
      newAchievements[achievementIndex] = value
      onUpdate({ ...experience, achievements: newAchievements })
    }

    const addAchievement = () => {
      onUpdate({
        ...experience,
        achievements: [...experience.achievements, ""]
      })
    }

    const removeAchievement = (achievementIndex: number) => {
      const newAchievements = experience.achievements.filter(
        (_, i) => i !== achievementIndex
      )
      onUpdate({ ...experience, achievements: newAchievements })
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={experience.jobTitle}
              onChange={(e) =>
                onUpdate({ ...experience, jobTitle: e.target.value })
              }
              placeholder="e.g., Senior Frontend Developer"
              className={`w-full px-4 py-3 border rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                         hasErrors ? "border-red-300" : "border-gray-300"
                       }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company *
            </label>
            <input
              type="text"
              value={experience.company}
              onChange={(e) =>
                onUpdate({ ...experience, company: e.target.value })
              }
              placeholder="e.g., Tech Corp"
              className={`w-full px-4 py-3 border rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                         hasErrors ? "border-red-300" : "border-gray-300"
                       }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Start Date *"
            value={experience.startDate}
            onChange={(date) =>
              onUpdate({ ...experience, startDate: date || "" })
            }
            required
          />

          <DatePicker
            label="End Date"
            value={experience.endDate}
            onChange={(date) => onUpdate({ ...experience, endDate: date })}
            showCurrentPosition
            currentPosition={isCurrentPosition}
            onCurrentPositionChange={(isCurrent) =>
              onUpdate({
                ...experience,
                endDate: isCurrent ? null : experience.endDate
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Achievements *
          </label>
          <div className="space-y-2">
            {experience.achievements.map((achievement, achievementIndex) => (
              <div key={achievementIndex} className="flex gap-2">
                <input
                  type="text"
                  value={achievement}
                  onChange={(e) =>
                    updateAchievement(achievementIndex, e.target.value)
                  }
                  placeholder="e.g., Led redesign of main product UI"
                  className={`flex-1 px-4 py-3 border rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                             hasErrors ? "border-red-300" : "border-gray-300"
                           }`}
                />
                {experience.achievements.length > 1 && (
                  <button
                    onClick={() => removeAchievement(achievementIndex)}
                    className="px-3 py-2 text-red-500 hover:text-red-700
                             border border-red-300 rounded-lg hover:bg-red-50">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addAchievement}
            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg
                     hover:bg-gray-200 transition-colors font-medium">
            + Add Achievement
          </button>
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
      {editingExperience && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">
            Add New Work Experience
          </h3>
          {renderExperienceItem(editingExperience, 0, setEditingExperience)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingExperience}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 transition-colors font-medium">
              Save Experience
            </button>
            <button
              onClick={() => setEditingExperience(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                       hover:bg-gray-300 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ArrayInput
        items={experiences}
        onAdd={addExperience}
        onUpdate={updateExperience}
        onRemove={removeExperience}
        renderItem={renderExperienceItem}
        renderSummary={(exp) => {
          const fmt = (iso: string | null) => {
            if (!iso) return "Present"
            const [y, m] = iso.split("-")
            return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`
          }
          return (
            <div className="flex flex-1 items-center justify-between min-w-0 pr-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                  {exp.jobTitle || <span className="italic text-gray-400">Untitled role</span>}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {exp.company || "—"}
                </p>
              </div>
              {exp.startDate && (
                <span className="ml-4 shrink-0 text-xs text-gray-400">
                  {fmt(exp.startDate)} – {fmt(exp.endDate)}
                </span>
              )}
            </div>
          )
        }}
        emptyMessage="No work experience added yet. Add your first position to get started!"
        addButtonText="Work Experience"
      />
    </div>
  )
}

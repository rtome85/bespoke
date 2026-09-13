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

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2"

const inputCls =
  "w-full px-4 py-3 bg-white border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"

const inputErrorCls =
  "w-full px-4 py-3 bg-white border border-[#fca5a5] text-ink text-sm focus:outline-none focus:border-[#991b1b] transition-colors"

export function ExperienceEditor({ experiences, onChange }: ExperienceEditorProps) {
  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null)

  const addExperience = () => {
    setEditingExperience({
      id: crypto.randomUUID(),
      jobTitle: "",
      company: "",
      startDate: "",
      endDate: null,
      achievements: [""]
    })
  }

  const updateExperience = (index: number, experience: WorkExperience) => {
    const newExperiences = [...experiences]
    newExperiences[index] = experience
    onChange(newExperiences)
  }

  const removeExperience = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index))
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
      onUpdate({ ...experience, achievements: [...experience.achievements, ""] })
    }

    const removeAchievement = (achievementIndex: number) => {
      onUpdate({
        ...experience,
        achievements: experience.achievements.filter((_, i) => i !== achievementIndex)
      })
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Job Title *</label>
            <input
              type="text"
              value={experience.jobTitle}
              onChange={(e) => onUpdate({ ...experience, jobTitle: e.target.value })}
              placeholder="e.g., Senior Frontend Developer"
              className={hasErrors && !experience.jobTitle ? inputErrorCls : inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Company *</label>
            <input
              type="text"
              value={experience.company}
              onChange={(e) => onUpdate({ ...experience, company: e.target.value })}
              placeholder="e.g., Tech Corp"
              className={hasErrors && !experience.company ? inputErrorCls : inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Start Date *"
            value={experience.startDate}
            onChange={(date) => onUpdate({ ...experience, startDate: date || "" })}
            required
          />
          <DatePicker
            label="End Date"
            value={experience.endDate}
            onChange={(date) => onUpdate({ ...experience, endDate: date })}
            showCurrentPosition
            currentPosition={isCurrentPosition}
            onCurrentPositionChange={(isCurrent) =>
              onUpdate({ ...experience, endDate: isCurrent ? null : "" })
            }
          />
        </div>

        <div>
          <label className={labelCls}>Achievements *</label>
          <div className="space-y-2">
            {experience.achievements.map((achievement, achievementIndex) => (
              <div key={achievementIndex} className="flex gap-2">
                <input
                  type="text"
                  value={achievement}
                  onChange={(e) => updateAchievement(achievementIndex, e.target.value)}
                  placeholder="e.g., Led redesign of main product UI"
                  className={hasErrors && !achievement ? inputErrorCls : inputCls}
                />
                {experience.achievements.length > 1 && (
                  <button
                    onClick={() => removeAchievement(achievementIndex)}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#991b1b] border border-[#fca5a5] hover:bg-[#fef2f2] transition-colors">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addAchievement}
            className="mt-2 px-4 py-2 bg-canvas border border-canvas-input-border text-ink text-[11px] font-semibold uppercase tracking-widest hover:border-ink transition-colors">
            + Add Achievement
          </button>
        </div>

        {hasErrors && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b] px-4 py-3">
            {errors.map((error, i) => (
              <p key={i} className="text-sm">• {error}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {editingExperience && (
        <div className="bg-canvas border-2 border-ink p-4 mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink mb-4">
            Add New Work Experience
          </h3>
          {renderExperienceItem(editingExperience, 0, setEditingExperience)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingExperience}
              className="px-4 py-2 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity">
              Save Experience
            </button>
            <button
              onClick={() => setEditingExperience(null)}
              className="px-4 py-2 bg-canvas border border-canvas-input-border text-ink text-[11px] font-semibold uppercase tracking-widest cursor-pointer hover:border-ink transition-colors">
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
                <p className="text-sm font-medium text-ink truncate leading-tight">
                  {exp.jobTitle || <span className="italic text-ink-muted">Untitled role</span>}
                </p>
                <p className="text-xs text-ink-secondary truncate mt-0.5">
                  {exp.company || "—"}
                </p>
              </div>
              {exp.startDate && (
                <span className="ml-4 shrink-0 text-xs text-ink-muted">
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

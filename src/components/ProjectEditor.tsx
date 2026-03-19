import React, { useState } from "react"

import type { PersonalProject } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"

interface ProjectEditorProps {
  projects: PersonalProject[]
  onChange: (projects: PersonalProject[]) => void
}

const isValidUrl = (url: string): boolean => {
  try { new URL(url); return true } catch { return false }
}

const validateProject = (project: PersonalProject): string[] => {
  const errors = []
  if (!project.title.trim()) errors.push("Project title is required")
  if (!project.description.trim()) errors.push("Project description is required")
  if (project.description.length > 500) errors.push("Description must be 500 characters or less")
  if (project.liveDemoUrl && !isValidUrl(project.liveDemoUrl)) errors.push("Invalid live demo URL")
  if (project.githubRepoUrl && !isValidUrl(project.githubRepoUrl)) errors.push("Invalid GitHub repository URL")
  return errors
}

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2"

const inputCls =
  "w-full px-4 py-3 bg-canvas border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"

const inputErrorCls =
  "w-full px-4 py-3 bg-canvas border border-[#fca5a5] text-ink text-sm focus:outline-none focus:border-[#991b1b] transition-colors"

export function ProjectEditor({ projects, onChange }: ProjectEditorProps) {
  const [editingProject, setEditingProject] = useState<PersonalProject | null>(null)

  const addProject = () => {
    setEditingProject({ id: crypto.randomUUID(), title: "", description: "", liveDemoUrl: "", githubRepoUrl: "" })
  }

  const updateProject = (index: number, project: PersonalProject) => {
    const newProjects = [...projects]
    newProjects[index] = project
    onChange(newProjects)
  }

  const removeProject = (index: number) => {
    onChange(projects.filter((_, i) => i !== index))
  }

  const saveEditingProject = () => {
    if (editingProject) {
      const errors = validateProject(editingProject)
      if (errors.length === 0) {
        onChange([...projects, editingProject])
        setEditingProject(null)
      } else {
        alert(errors.join("\n"))
      }
    }
  }

  const renderProjectItem = (
    project: PersonalProject,
    index: number,
    onUpdate: (project: PersonalProject) => void
  ) => {
    const errors = validateProject(project)
    const hasErrors = errors.length > 0

    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Project Title *</label>
          <input
            type="text"
            value={project.title}
            onChange={(e) => onUpdate({ ...project, title: e.target.value })}
            placeholder="e.g., E-commerce Platform"
            className={hasErrors && !project.title ? inputErrorCls : inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Description *</label>
          <textarea
            value={project.description}
            onChange={(e) => onUpdate({ ...project, description: e.target.value })}
            placeholder="Describe your project, its purpose, technologies used, and your role..."
            rows={4}
            maxLength={500}
            className={`${hasErrors && !project.description ? inputErrorCls : inputCls} resize-none`}
          />
          <p className="mt-1 text-[11px] text-ink-secondary">
            {project.description.length}/500 characters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Live Demo URL</label>
            <input
              type="url"
              value={project.liveDemoUrl || ""}
              onChange={(e) => onUpdate({ ...project, liveDemoUrl: e.target.value })}
              placeholder="https://your-project-demo.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>GitHub Repository URL</label>
            <input
              type="url"
              value={project.githubRepoUrl || ""}
              onChange={(e) => onUpdate({ ...project, githubRepoUrl: e.target.value })}
              placeholder="https://github.com/username/repo"
              className={inputCls}
            />
          </div>
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
      {editingProject && (
        <div className="bg-canvas border-2 border-ink p-4 mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink mb-4">
            Add New Personal Project
          </h3>
          {renderProjectItem(editingProject, 0, setEditingProject)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingProject}
              className="px-4 py-2 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity">
              Save Project
            </button>
            <button
              onClick={() => setEditingProject(null)}
              className="px-4 py-2 bg-canvas border border-canvas-input-border text-ink text-[11px] font-semibold uppercase tracking-widest cursor-pointer hover:border-ink transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ArrayInput
        items={projects}
        onAdd={addProject}
        onUpdate={updateProject}
        onRemove={removeProject}
        renderItem={renderProjectItem}
        renderSummary={(project) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate leading-tight">
              {project.title || <span className="italic text-ink-muted">Untitled project</span>}
            </p>
            {project.description && (
              <p className="text-xs text-ink-secondary truncate mt-0.5">
                {project.description.length > 80
                  ? project.description.slice(0, 80) + "…"
                  : project.description}
              </p>
            )}
          </div>
        )}
        emptyMessage="No personal projects added yet. Add your first project to showcase your work!"
        addButtonText="Personal Project"
      />
    </div>
  )
}

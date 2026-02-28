import React, { useState } from "react"

import type { PersonalProject } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"

interface ProjectEditorProps {
  projects: PersonalProject[]
  onChange: (projects: PersonalProject[]) => void
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const validateProject = (project: PersonalProject): string[] => {
  const errors = []
  if (!project.title.trim()) errors.push("Project title is required")
  if (!project.description.trim())
    errors.push("Project description is required")
  if (project.description.length > 500)
    errors.push("Description must be 500 characters or less")
  if (project.liveDemoUrl && !isValidUrl(project.liveDemoUrl)) {
    errors.push("Invalid live demo URL")
  }
  if (project.githubRepoUrl && !isValidUrl(project.githubRepoUrl)) {
    errors.push("Invalid GitHub repository URL")
  }
  return errors
}

export function ProjectEditor({ projects, onChange }: ProjectEditorProps) {
  const [editingProject, setEditingProject] = useState<PersonalProject | null>(
    null
  )

  const addProject = () => {
    const newProject: PersonalProject = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      liveDemoUrl: "",
      githubRepoUrl: ""
    }
    setEditingProject(newProject)
  }

  const updateProject = (index: number, project: PersonalProject) => {
    const newProjects = [...projects]
    newProjects[index] = project
    onChange(newProjects)
  }

  const removeProject = (index: number) => {
    const newProjects = projects.filter((_, i) => i !== index)
    onChange(newProjects)
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Title *
          </label>
          <input
            type="text"
            value={project.title}
            onChange={(e) => onUpdate({ ...project, title: e.target.value })}
            placeholder="e.g., E-commerce Platform"
            className={`w-full px-4 py-3 border rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasErrors ? "border-red-300" : "border-gray-300"
                     }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={project.description}
            onChange={(e) =>
              onUpdate({ ...project, description: e.target.value })
            }
            placeholder="Describe your project, its purpose, technologies used, and your role..."
            rows={4}
            maxLength={500}
            className={`w-full px-4 py-3 border rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     resize-none ${
                       hasErrors ? "border-red-300" : "border-gray-300"
                     }`}
          />
          <p className="mt-1 text-sm text-gray-500">
            {project.description.length}/500 characters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Live Demo URL
            </label>
            <input
              type="url"
              value={project.liveDemoUrl || ""}
              onChange={(e) =>
                onUpdate({ ...project, liveDemoUrl: e.target.value })
              }
              placeholder="https://your-project-demo.com"
              className={`w-full px-4 py-3 border rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                         hasErrors ? "border-red-300" : "border-gray-300"
                       }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={project.githubRepoUrl || ""}
              onChange={(e) =>
                onUpdate({ ...project, githubRepoUrl: e.target.value })
              }
              placeholder="https://github.com/username/repo"
              className={`w-full px-4 py-3 border rounded-lg
                       focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                         hasErrors ? "border-red-300" : "border-gray-300"
                       }`}
            />
          </div>
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
      {editingProject && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">
            Add New Personal Project
          </h3>
          {renderProjectItem(editingProject, 0, setEditingProject)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveEditingProject}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 transition-colors font-medium">
              Save Project
            </button>
            <button
              onClick={() => setEditingProject(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                       hover:bg-gray-300 transition-colors font-medium">
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
            <p className="text-sm font-medium text-gray-900 truncate leading-tight">
              {project.title || <span className="italic text-gray-400">Untitled project</span>}
            </p>
            {project.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
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

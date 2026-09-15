import { Plus } from "lucide-react"
import { useState } from "react"

import type { PersonalProject } from "~types/userProfile"

import { ArrayInput } from "./ArrayInput"
import { ProfileEntryModal } from "./ProfileEntryModal"

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
    // An untouched draft is not yet wrong: hold the required-field errors
    // back until something has been entered, so the add dialog doesn't open
    // already flagging two problems.
    const isBlank =
      !project.title.trim() &&
      !project.description.trim() &&
      !project.liveDemoUrl?.trim() &&
      !project.githubRepoUrl?.trim()
    const hasErrors = errors.length > 0 && !isBlank

    return (
      <div className="space-y-4">
        <div>
          <label className="aa-label">Project Title *</label>
          <input
            type="text"
            value={project.title}
            onChange={(e) => onUpdate({ ...project, title: e.target.value })}
            placeholder="e.g., E-commerce Platform"
            className={hasErrors && !project.title ? "aa-input-error" : "aa-input"}
          />
        </div>

        <div>
          <label className="aa-label">Description *</label>
          <textarea
            value={project.description}
            onChange={(e) => onUpdate({ ...project, description: e.target.value })}
            placeholder="Describe your project, its purpose, technologies used, and your role..."
            rows={4}
            maxLength={500}
            className={`${hasErrors && !project.description ? "aa-input-error" : "aa-input"} resize-none`}
          />
          <p className="mt-1 text-aa-11 text-aa-text-secondary">
            {project.description.length}/500 characters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="aa-label">Live Demo URL</label>
            <input
              type="url"
              value={project.liveDemoUrl || ""}
              onChange={(e) => onUpdate({ ...project, liveDemoUrl: e.target.value })}
              placeholder="https://your-project-demo.com"
              className="aa-input"
            />
          </div>
          <div>
            <label className="aa-label">GitHub Repository URL</label>
            <input
              type="url"
              value={project.githubRepoUrl || ""}
              onChange={(e) => onUpdate({ ...project, githubRepoUrl: e.target.value })}
              placeholder="https://github.com/username/repo"
              className="aa-input"
            />
          </div>
        </div>

        {hasErrors && (
          <div className="aa-message-error">
            {errors.map((error, i) => (
              <p key={i} className="text-sm">• {error}</p>
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
          Personal &amp; open-source projects
        </h2>
        <button
          onClick={addProject}
          className="aa-btn-outline inline-flex items-center gap-aa-2">
          <Plus className="w-aa-px-15 h-aa-px-15" />
          Add project
        </button>
      </div>

      {editingProject && (
        <ProfileEntryModal
          title="Add new personal project"
          saveLabel="Save project"
          onSave={saveEditingProject}
          onCancel={() => setEditingProject(null)}>
          {renderProjectItem(editingProject, 0, setEditingProject)}
        </ProfileEntryModal>
      )}

      <div className="aa-card-base">
        <ArrayInput
          items={projects}
          getItemKey={(project) => project.id}
          onAdd={addProject}
          onUpdate={updateProject}
          onRemove={removeProject}
          renderItem={renderProjectItem}
          renderSummary={(project) => (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-aa-text-primary truncate">
                {project.title || <span className="italic text-aa-text-secondary">Untitled project</span>}
              </p>
              {project.description && (
                <p className="text-xs text-aa-text-secondary truncate mt-0.5">
                  {project.description.length > 80
                    ? project.description.slice(0, 80) + "…"
                    : project.description}
                </p>
              )}
            </div>
          )}
          emptyMessage="No personal projects added yet. Add your first project to showcase your work!"
          addButtonText="Personal Project"
          flush
        />
      </div>
    </section>
  )
}

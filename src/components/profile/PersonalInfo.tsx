import { useState } from "react"

import type { PersonalInfo } from "~types/userProfile"

interface PersonalInfoProps {
  personalInfo: PersonalInfo
  onChange: (personalInfo: PersonalInfo) => void
}

const validatePersonalInfo = (info: any): string[] => {
  const errors = []
  if (!info) return errors

  if (!info.fullName?.trim()) errors.push("Full name is required")
  if (!info.email?.trim()) errors.push("Email is required")
  if (!info.phone?.trim()) errors.push("Phone is required")
  if (!info.location?.trim()) errors.push("Location is required")
  if (!info.summary?.trim()) errors.push("Summary is required")

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (info.email && !emailRegex.test(info.email)) {
    errors.push("Invalid email format")
  }

  return errors
}

export function PersonalInfo({ personalInfo, onChange }: PersonalInfoProps) {
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const safePersonalInfo = personalInfo || {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    summary: ""
  }

  const errors = hasSubmitted ? validatePersonalInfo(safePersonalInfo) : []
  const hasErrors = errors.length > 0

  const updateField = (field: string, value: string) => {
    setHasSubmitted(true)
    onChange({ ...safePersonalInfo, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="aa-label" htmlFor="profile-full-name">
          Full Name *
        </label>
        <input
          id="profile-full-name"
          type="text"
          value={safePersonalInfo.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          placeholder="e.g., John Doe"
          className={
            hasErrors && !safePersonalInfo.fullName
              ? "aa-input-error"
              : "aa-input"
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="aa-label" htmlFor="profile-email">
            Email *
          </label>
          <input
            id="profile-email"
            type="email"
            value={safePersonalInfo.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="e.g., john@example.com"
            className={
              hasErrors && !safePersonalInfo.email
                ? "aa-input-error"
                : "aa-input"
            }
          />
        </div>

        <div>
          <label className="aa-label" htmlFor="profile-phone">
            Phone *
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={safePersonalInfo.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="e.g., +1 (555) 123-4567"
            className={
              hasErrors && !safePersonalInfo.phone
                ? "aa-input-error"
                : "aa-input"
            }
          />
        </div>
      </div>

      <div>
        <label className="aa-label" htmlFor="profile-location">
          Location *
        </label>
        <input
          id="profile-location"
          type="text"
          value={safePersonalInfo.location}
          onChange={(e) => updateField("location", e.target.value)}
          placeholder="e.g., San Francisco, CA"
          className={
            hasErrors && !safePersonalInfo.location
              ? "aa-input-error"
              : "aa-input"
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="aa-label" htmlFor="profile-website">
            Website
          </label>
          <input
            id="profile-website"
            type="url"
            value={safePersonalInfo.website || ""}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://yourwebsite.com"
            className="aa-input"
          />
        </div>

        <div>
          <label className="aa-label" htmlFor="profile-linkedin">
            LinkedIn
          </label>
          <input
            id="profile-linkedin"
            type="url"
            value={safePersonalInfo.linkedin || ""}
            onChange={(e) => updateField("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className="aa-input"
          />
        </div>

        <div>
          <label className="aa-label" htmlFor="profile-github">
            GitHub
          </label>
          <input
            id="profile-github"
            type="url"
            value={safePersonalInfo.github || ""}
            onChange={(e) => updateField("github", e.target.value)}
            placeholder="https://github.com/username"
            className="aa-input"
          />
        </div>
      </div>

      <div>
        <label className="aa-label" htmlFor="profile-summary">
          Professional Summary *
        </label>
        <textarea
          id="profile-summary"
          value={safePersonalInfo.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="Write a brief summary of your professional background, key skills, and career goals..."
          rows={6}
          maxLength={500}
          className={`${
            hasErrors && !safePersonalInfo.summary
              ? "aa-input-error"
              : "aa-input"
          } resize-none`}
        />
        <p className="aa-hint">
          {safePersonalInfo.summary.length}/500 characters
        </p>
      </div>

      {hasErrors && (
        <div className="aa-message-error" role="alert">
          {errors.map((error) => (
            <p key={error} className="text-sm">
              • {error}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

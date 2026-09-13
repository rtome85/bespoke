import React, { useState } from "react"

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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          value={safePersonalInfo.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          placeholder="e.g., John Doe"
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                     hasErrors && !safePersonalInfo.fullName
                       ? "border-red-300"
                       : ""
                   }`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={safePersonalInfo.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="e.g., john@example.com"
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasErrors && !safePersonalInfo.email
                         ? "border-red-300"
                         : ""
                     }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone *
          </label>
          <input
            type="tel"
            value={safePersonalInfo.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="e.g., +1 (555) 123-4567"
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                       hasErrors && !safePersonalInfo.phone
                         ? "border-red-300"
                         : ""
                     }`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location *
        </label>
        <input
          type="text"
          value={safePersonalInfo.location}
          onChange={(e) => updateField("location", e.target.value)}
          placeholder="e.g., San Francisco, CA"
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                     hasErrors && !safePersonalInfo.location
                       ? "border-red-300"
                       : ""
                   }`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            value={safePersonalInfo.website || ""}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LinkedIn
          </label>
          <input
            type="url"
            value={safePersonalInfo.linkedin || ""}
            onChange={(e) => updateField("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub
          </label>
          <input
            type="url"
            value={safePersonalInfo.github || ""}
            onChange={(e) => updateField("github", e.target.value)}
            placeholder="https://github.com/username"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Professional Summary *
        </label>
        <textarea
          value={safePersonalInfo.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="Write a brief summary of your professional background, key skills, and career goals..."
          rows={6}
          maxLength={500}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                     hasErrors && !safePersonalInfo.summary
                       ? "border-red-300"
                       : ""
                   }`}
        />
        <p className="mt-1 text-sm text-gray-500">
          {safePersonalInfo.summary.length}/500 characters
        </p>
      </div>

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
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

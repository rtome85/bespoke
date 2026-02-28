import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

import { EducationEditor } from "~components/Education"
import { ExperienceEditor } from "~components/ExperienceEditor"
import { LanguageEditor } from "~components/LanguageEditor"
import { PersonalInfo } from "~components/PersonalInfo"
import { ProjectEditor } from "~components/ProjectEditor"
import { PromptDialog } from "~components/PromptDialog"
import { SkillEditor } from "~components/SkillEditor"
import { Tabs } from "~components/Tabs"
import { AVAILABLE_MODELS, DEFAULT_PROMPTS, PROMPTS_VERSION, type CustomPrompts } from "~types/config"
import { DEFAULT_USER_PROFILE, type UserProfile } from "~types/userProfile"

import "./style.css"

function Options() {
  const [activeTab, setActiveTab] = useState("ai-settings")

  const [userProfile, setUserProfile] = useStorage<UserProfile>(
    "userProfile",
    DEFAULT_USER_PROFILE
  )

  const [ollamaConfig, setOllamaConfig] = useStorage("ollamaConfig", {
    apiKey: "",
    baseUrl: "https://ollama.com/api",
    enabled: false
  })

  const [customPrompts, setCustomPrompts] = useStorage<CustomPrompts>(
    "customPrompts",
    DEFAULT_PROMPTS
  )

  const [storedPromptsVersion, setStoredPromptsVersion, { isLoading: isVersionLoading }] = useStorage<string>(
    "promptsVersion",
    ""
  )

  useEffect(() => {
    if (!isVersionLoading && storedPromptsVersion !== PROMPTS_VERSION) {
      setCustomPrompts(DEFAULT_PROMPTS)
      setStoredPromptsVersion(PROMPTS_VERSION)
    }
  }, [storedPromptsVersion, isVersionLoading])

  const [testStatus, setTestStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    message: string
  }>({ type: "idle", message: "" })

  const [saveStatus, setSaveStatus] = useState("")

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    title: string
    promptKey: keyof CustomPrompts | null
  }>({ isOpen: false, title: "", promptKey: null })

  const handleTestOllama = async () => {
    if (!ollamaConfig.apiKey) {
      setTestStatus({ type: "error", message: "Please enter API key first" })
      return
    }

    setTestStatus({ type: "loading", message: "Testing connection..." })

    try {
      const response = await sendToBackground({
        name: "testOllamaConnection",
        body: { apiKey: ollamaConfig.apiKey, baseUrl: ollamaConfig.baseUrl }
      })

      if (response?.success) {
        setTestStatus({ type: "success", message: response.message })
      } else {
        setTestStatus({
          type: "error",
          message: response?.message || "Connection failed."
        })
      }
    } catch (error) {
      setTestStatus({
        type: "error",
        message: "Connection failed. Please check your internet connection."
      })
    }

    setTimeout(() => setTestStatus({ type: "idle", message: "" }), 5000)
  }

  const handleSaveSettings = () => {
    chrome.storage.local.set({ ollamaConfig, customPrompts, userProfile })
    setSaveStatus("Settings saved successfully!")
    setTimeout(() => setSaveStatus(""), 3000)
  }

  const handleResetPrompts = () => {
    if (confirm("Reset all custom prompts to default?")) {
      setCustomPrompts(DEFAULT_PROMPTS)
      setSaveStatus("Prompts reset to defaults")
      setTimeout(() => setSaveStatus(""), 3000)
    }
  }

  const handlePromptChange = (key: keyof CustomPrompts, value: string) => {
    setCustomPrompts({ ...customPrompts, [key]: value })
  }

  const openPromptDialog = (title: string, promptKey: keyof CustomPrompts) => {
    setDialogState({ isOpen: true, title, promptKey })
  }

  const closePromptDialog = () => {
    setDialogState({ isOpen: false, title: "", promptKey: null })
  }

  const savePromptFromDialog = (prompt: string) => {
    if (dialogState.promptKey) {
      setCustomPrompts({ ...customPrompts, [dialogState.promptKey]: prompt })
    }
  }

  const handleExportData = async () => {
    try {
      const data = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        ollamaConfig,
        customPrompts,
        userProfile
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jobtailor-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSaveStatus("Data exported successfully!")
      setTimeout(() => setSaveStatus(""), 3000)
    } catch (error) {
      alert("Failed to export data: " + error)
    }
  }

  const handleImportData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        const dateLabel = data.exportDate
          ? new Date(data.exportDate).toLocaleDateString()
          : "unknown date"

        if (
          confirm(
            `Import data from ${dateLabel}? This will overwrite your current settings and profile.`
          )
        ) {
          if (data.ollamaConfig) setOllamaConfig(data.ollamaConfig)
          if (data.customPrompts) setCustomPrompts(data.customPrompts)
          if (data.userProfile) setUserProfile(data.userProfile)

          setSaveStatus("Data imported successfully!")
          setTimeout(() => setSaveStatus(""), 3000)
        }
      } catch (error) {
        alert("Failed to import data: Invalid JSON format")
      }
    }

    input.click()
  }

  const tabs = [
    {
      label: "Ollama",
      value: "ai-settings",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Ollama Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <input
                type="password"
                value={ollamaConfig.apiKey}
                onChange={(e) =>
                  setOllamaConfig({ ...ollamaConfig, apiKey: e.target.value })
                }
                placeholder="oll-..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Get your API key from{" "}
                <a
                  href="https://ollama.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline">
                  ollama.com/settings/keys
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={ollamaConfig.baseUrl}
                onChange={(e) =>
                  setOllamaConfig({ ...ollamaConfig, baseUrl: e.target.value })
                }
                placeholder="https://ollama.com/api"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Default is fine for most users.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Models
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  {AVAILABLE_MODELS.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="font-medium">{model.name}</span>
                        {model.recommended && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500">{model.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleTestOllama}
                disabled={testStatus.type === "loading"}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg
                         hover:bg-gray-200 transition-colors font-medium
                         disabled:opacity-50">
                {testStatus.type === "loading" ? "Testing..." : "Test Connection"}
              </button>
            </div>

            {testStatus.type === "success" && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                {testStatus.message}
              </div>
            )}
            {testStatus.type === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {testStatus.message}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      label: "Prompts",
      value: "prompts",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Custom Prompts
            </h2>
            <button
              onClick={handleResetPrompts}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg
                       hover:bg-gray-200 transition-colors">
              Reset to Defaults
            </button>
          </div>

          <div className="space-y-6">
            {(
              [
                {
                  key: "resumeSystemPrompt" as keyof CustomPrompts,
                  label: "Resume System Prompt",
                  hint: "Defines how the AI behaves when generating resumes."
                },
                {
                  key: "resumeUserPromptTemplate" as keyof CustomPrompts,
                  label: "Resume User Prompt Template",
                  hint: 'Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders.'
                },
                {
                  key: "coverLetterSystemPrompt" as keyof CustomPrompts,
                  label: "Cover Letter System Prompt",
                  hint: "Defines how the AI behaves when generating cover letters."
                },
                {
                  key: "coverLetterUserPromptTemplate" as keyof CustomPrompts,
                  label: "Cover Letter User Prompt Template",
                  hint: 'Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders.'
                }
              ] as const
            ).map(({ key, label, hint }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <textarea
                  value={customPrompts[key]}
                  onChange={(e) => handlePromptChange(key, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           font-mono text-sm"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">{hint}</p>
                  <button
                    onClick={() => openPromptDialog(label, key)}
                    className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded
                             hover:bg-purple-200 transition-colors font-medium">
                    Expand
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      label: "Personal Info",
      value: "personal-info",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Personal Information
          </h2>
          <PersonalInfo
            personalInfo={userProfile.personalInfo}
            onChange={(personalInfo) =>
              setUserProfile({ ...userProfile, personalInfo })
            }
          />
        </div>
      )
    },
    {
      label: "Education",
      value: "education",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Education
          </h2>
          <EducationEditor
            education={userProfile.education}
            onChange={(education) =>
              setUserProfile({ ...userProfile, education })
            }
          />
        </div>
      )
    },
    {
      label: "Skills",
      value: "skills",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Skills & Expertise
          </h2>
          <SkillEditor
            skills={userProfile.skills}
            onChange={(skills) => setUserProfile({ ...userProfile, skills })}
          />
        </div>
      )
    },
    {
      label: "Experience",
      value: "experience",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Work Experience
          </h2>
          <ExperienceEditor
            experiences={userProfile.workExperience}
            onChange={(workExperience) =>
              setUserProfile({ ...userProfile, workExperience })
            }
          />
        </div>
      )
    },
    {
      label: "Projects",
      value: "projects",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Personal Projects
          </h2>
          <ProjectEditor
            projects={userProfile.personalProjects}
            onChange={(personalProjects) =>
              setUserProfile({ ...userProfile, personalProjects })
            }
          />
        </div>
      )
    },
    {
      label: "Languages",
      value: "languages",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Languages
          </h2>
          <LanguageEditor
            languages={userProfile.languages}
            onChange={(languages) =>
              setUserProfile({ ...userProfile, languages })
            }
          />
        </div>
      )
    }
  ]

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
        <div className="w-full max-w-none lg:px-16 px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              JobTailor Settings
            </h1>
            <p className="text-gray-600">
              Configure Ollama, customize prompts, and manage your profile
            </p>
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex gap-4 mb-6 mt-8">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 transition-colors font-medium">
              Save Settings
            </button>
            <button
              onClick={handleExportData}
              className="px-6 py-3 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 transition-colors font-medium">
              Export Data
            </button>
            <button
              onClick={handleImportData}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 transition-colors font-medium">
              Import Data
            </button>
          </div>

          {saveStatus && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {saveStatus}
            </div>
          )}

          <div className="mt-8 text-sm text-gray-500">
            <p>JobTailor v1.0.0 — Built with Plasmo Framework</p>
          </div>
        </div>
      </div>

      <PromptDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        prompt={dialogState.promptKey ? customPrompts[dialogState.promptKey] : ""}
        onClose={closePromptDialog}
        onSave={savePromptFromDialog}
      />
    </>
  )
}

export default Options

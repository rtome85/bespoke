import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

import { CertificateEditor } from "~components/CertificateEditor"
import { EducationEditor } from "~components/Education"
import { ExperienceEditor } from "~components/ExperienceEditor"
import { LanguageEditor } from "~components/LanguageEditor"
import { LinkedInImportButton } from "~components/LinkedInImportButton"
import { PersonalInfo } from "~components/PersonalInfo"
import { ProjectEditor } from "~components/ProjectEditor"
import { PromptDialog } from "~components/PromptDialog"
import { SkillEditor } from "~components/SkillEditor"
import { Tabs } from "~components/Tabs"
import {
  AVAILABLE_MODELS,
  DEFAULT_LLM_TUNING,
  DEFAULT_PERPLEXITY_PROMPT,
  DEFAULT_PREPARATION_PLAN_PROMPT,
  DEFAULT_PROMPTS,
  PROMPT_TEMPLATES,
  PROMPTS_VERSION,
  type CustomPrompts,
  type LLMTuningConfig,
  type PerplexityConfig,
  type PromptTemplate
} from "~types/config"
import { DEFAULT_USER_PROFILE, type UserProfile } from "~types/userProfile"
import {
  authorize,
  pull,
  revoke,
  type SyncConfig
} from "~utils/googleDriveSync"

import "./style.css"

function mergeWorkExperience(
  existing: UserProfile["workExperience"],
  incoming: UserProfile["workExperience"] = []
): UserProfile["workExperience"] {
  const key = (w: UserProfile["workExperience"][number]) =>
    `${w.company}|${w.jobTitle}|${w.startDate}`
  const seen = new Set(existing.map(key))
  return [...existing, ...incoming.filter((w) => !seen.has(key(w)))]
}

function mergeEducation(
  existing: UserProfile["education"],
  incoming: UserProfile["education"] = []
): UserProfile["education"] {
  const key = (e: UserProfile["education"][number]) =>
    `${e.institution}|${e.degree}`
  const seen = new Set(existing.map(key))
  return [...existing, ...incoming.filter((e) => !seen.has(key(e)))]
}

function mergeSkills(
  existing: UserProfile["skills"],
  incoming: UserProfile["skills"] = []
): UserProfile["skills"] {
  const seen = new Set(existing.map((s) => s.name.toLowerCase()))
  return [...existing, ...incoming.filter((s) => !seen.has(s.name.toLowerCase()))]
}

function mergeLanguages(
  existing: UserProfile["languages"],
  incoming: UserProfile["languages"] = []
): UserProfile["languages"] {
  const seen = new Set(existing.map((l) => l.name.toLowerCase()))
  return [...existing, ...incoming.filter((l) => !seen.has(l.name.toLowerCase()))]
}

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

  const [perplexityConfig, setPerplexityConfig] = useStorage<PerplexityConfig>(
    "perplexityConfig",
    {
      apiKey: "",
      enabled: false,
      customPrompt: DEFAULT_PERPLEXITY_PROMPT,
      preparationPlanEnabled: false,
      preparationPlanPrompt: DEFAULT_PREPARATION_PLAN_PROMPT
    }
  )

  const [customPrompts, setCustomPrompts] = useStorage<CustomPrompts>(
    "customPrompts",
    DEFAULT_PROMPTS
  )

  const [llmTuning, setLlmTuning] = useStorage<LLMTuningConfig>(
    "llmTuning",
    DEFAULT_LLM_TUNING
  )

  const [
    storedPromptsVersion,
    setStoredPromptsVersion,
    { isLoading: isVersionLoading }
  ] = useStorage<string>("promptsVersion", "")

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

  const [perplexityTestStatus, setPerplexityTestStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    message: string
  }>({ type: "idle", message: "" })

  const [saveStatus, setSaveStatus] = useState("")

  const [syncConfig, setSyncConfig] = useStorage<SyncConfig | null>(
    "syncConfig",
    null
  )
  const [syncStatus, setSyncStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    message: string
  }>({ type: "idle", message: "" })

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    title: string
    promptKey: keyof CustomPrompts | null
  }>({ isOpen: false, title: "", promptKey: null })

  const [perplexityDialogState, setPerplexityDialogState] = useState<{
    isOpen: boolean
    title: string
    promptType: "research" | "preparation" | null
  }>({ isOpen: false, title: "", promptType: null })

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

  const handleTestPerplexity = async () => {
    if (!perplexityConfig.apiKey) {
      setPerplexityTestStatus({
        type: "error",
        message: "Please enter API key first"
      })
      return
    }

    setPerplexityTestStatus({
      type: "loading",
      message: "Testing connection..."
    })

    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityConfig.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              {
                role: "user",
                content: "Say 'Connection successful' in one sentence."
              }
            ],
            max_tokens: 20
          })
        }
      )

      if (response.ok) {
        setPerplexityTestStatus({
          type: "success",
          message: "Connection successful! Perplexity Sonar is ready."
        })
      } else {
        setPerplexityTestStatus({
          type: "error",
          message: `Connection failed: ${response.status} ${response.statusText}`
        })
      }
    } catch (error) {
      setPerplexityTestStatus({
        type: "error",
        message:
          "Connection failed. Please check your internet connection and API key."
      })
    }

    setTimeout(
      () => setPerplexityTestStatus({ type: "idle", message: "" }),
      5000
    )
  }

  const handleSaveSettings = () => {
    chrome.storage.local.set({
      ollamaConfig,
      perplexityConfig,
      customPrompts,
      userProfile
    })
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

  const openPerplexityDialog = (
    title: string,
    promptType: "research" | "preparation"
  ) => {
    setPerplexityDialogState({ isOpen: true, title, promptType })
  }

  const closePerplexityDialog = () => {
    setPerplexityDialogState({ isOpen: false, title: "", promptType: null })
  }

  const savePerplexityPromptFromDialog = (prompt: string) => {
    if (perplexityDialogState.promptType === "research") {
      setPerplexityConfig({ ...perplexityConfig, customPrompt: prompt })
    } else if (perplexityDialogState.promptType === "preparation") {
      setPerplexityConfig({
        ...perplexityConfig,
        preparationPlanPrompt: prompt
      })
    }
  }

  const activeTemplateName = PROMPT_TEMPLATES.find(
    (t) =>
      t.prompts.resumeSystemPrompt === customPrompts?.resumeSystemPrompt &&
      t.prompts.resumeUserPromptTemplate ===
        customPrompts?.resumeUserPromptTemplate &&
      t.prompts.coverLetterSystemPrompt ===
        customPrompts?.coverLetterSystemPrompt &&
      t.prompts.coverLetterUserPromptTemplate ===
        customPrompts?.coverLetterUserPromptTemplate
  )?.name

  const handleApplyTemplate = (template: PromptTemplate) => {
    const isCustomised = activeTemplateName === undefined
    if (
      isCustomised &&
      !confirm(
        `Apply "${template.name}"? This will overwrite your current custom prompts.`
      )
    )
      return
    setCustomPrompts(template.prompts)
  }

  const handleExportData = async () => {
    try {
      const { savedApplications } =
        await chrome.storage.local.get("savedApplications")
      const data = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        ollamaConfig,
        customPrompts,
        userProfile,
        llmTuning,
        savedApplications: savedApplications ?? []
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
          if (data.llmTuning) setLlmTuning(data.llmTuning)
          if (data.savedApplications) {
            await chrome.storage.local.set({
              savedApplications: data.savedApplications
            })
          }

          setSaveStatus("Data imported successfully!")
          setTimeout(() => setSaveStatus(""), 3000)
        }
      } catch (error) {
        alert("Failed to import data: Invalid JSON format")
      }
    }

    input.click()
  }

  const handleConnectDrive = async () => {
    setSyncStatus({ type: "loading", message: "Connecting to Google Drive..." })
    try {
      const token = await authorize()
      await setSyncConfig({ token, lastSynced: null })
      setSyncStatus({
        type: "success",
        message: "Connected! Your data will sync automatically."
      })
    } catch (err) {
      setSyncStatus({ type: "error", message: (err as Error).message })
    }
    setTimeout(() => setSyncStatus({ type: "idle", message: "" }), 5000)
  }

  const handleForcePull = async () => {
    if (!syncConfig?.token) return
    setSyncStatus({
      type: "loading",
      message: "Restoring from Google Drive..."
    })
    try {
      await pull(syncConfig.token)
      await setSyncConfig({
        ...syncConfig,
        lastSynced: new Date().toISOString()
      })
      setSyncStatus({
        type: "success",
        message: "Data restored from Google Drive!"
      })
    } catch (err) {
      setSyncStatus({ type: "error", message: (err as Error).message })
    }
    setTimeout(() => setSyncStatus({ type: "idle", message: "" }), 5000)
  }

  const handleDisconnectDrive = async () => {
    if (!syncConfig?.token) return
    if (
      !confirm(
        "Disconnect Google Drive? Your local data will be kept, but automatic sync will stop."
      )
    )
      return
    setSyncStatus({ type: "loading", message: "Disconnecting..." })
    try {
      await revoke(syncConfig.token)
    } finally {
      await setSyncConfig(null)
      setSyncStatus({ type: "idle", message: "" })
    }
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
                {testStatus.type === "loading"
                  ? "Testing..."
                  : "Test Connection"}
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
      label: "Perplexity",
      value: "perplexity",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Perplexity Sonar Configuration
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Configure Perplexity Sonar to research companies and display
            information in the results. This enables the "About Company" section
            with industry, size, projects, and ratings from Glassdoor, Indeed,
            and Teamlyzer.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="perplexityEnabled"
                checked={perplexityConfig.enabled}
                onChange={(e) =>
                  setPerplexityConfig({
                    ...perplexityConfig,
                    enabled: e.target.checked
                  })
                }
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label
                htmlFor="perplexityEnabled"
                className="text-sm font-medium text-gray-700">
                Enable Company Research
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <input
                type="password"
                value={perplexityConfig.apiKey}
                onChange={(e) =>
                  setPerplexityConfig({
                    ...perplexityConfig,
                    apiKey: e.target.value
                  })
                }
                placeholder="pplx-..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Get your API key from{" "}
                <a
                  href="https://www.perplexity.ai/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline">
                  perplexity.ai/settings/api
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Prompt
              </label>
              <textarea
                value={perplexityConfig.customPrompt}
                onChange={(e) =>
                  setPerplexityConfig({
                    ...perplexityConfig,
                    customPrompt: e.target.value
                  })
                }
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Use {"{{companyName}}"} as a placeholder for the company name.
                  The prompt is sent to Perplexity Sonar to gather company
                  information.
                </p>
                <button
                  onClick={() =>
                    openPerplexityDialog("Research Prompt", "research")
                  }
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded
                           hover:bg-purple-200 transition-colors font-medium">
                  Expand
                </button>
              </div>
            </div>

            <hr className="border-gray-200 my-6" />

            {/* Preparation Plan Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Interview Preparation Plan
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Generate AI-powered technical interview preparation plans for HR
                and technical interviews. This helps you prepare with specific
                questions, coding challenges, and technical topics tailored to
                the job.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="preparationPlanEnabled"
                    checked={perplexityConfig.preparationPlanEnabled}
                    onChange={(e) =>
                      setPerplexityConfig({
                        ...perplexityConfig,
                        preparationPlanEnabled: e.target.checked
                      })
                    }
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <label
                    htmlFor="preparationPlanEnabled"
                    className="text-sm font-medium text-gray-700">
                    Enable Preparation Plan Generation
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preparation Plan Prompt
                  </label>
                  <textarea
                    value={perplexityConfig.preparationPlanPrompt}
                    onChange={(e) =>
                      setPerplexityConfig({
                        ...perplexityConfig,
                        preparationPlanPrompt: e.target.value
                      })
                    }
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent
                             font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Use {"{{companyName}}"}, {"{{jobTitle}}"},{" "}
                      {"{{jobDescription}}"}, and {"{{interviewType}}"} as
                      placeholders. This prompt is used to generate technical
                      interview preparation guides.
                    </p>
                    <button
                      onClick={() =>
                        openPerplexityDialog(
                          "Preparation Plan Prompt",
                          "preparation"
                        )
                      }
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded
                               hover:bg-purple-200 transition-colors font-medium">
                      Expand
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">
                Pricing
              </h3>
              <p className="text-xs text-blue-700">
                Perplexity Sonar costs $1 per 1M input tokens and $1 per 1M
                output tokens. A typical company research query costs
                approximately $0.0008.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleTestPerplexity}
                disabled={perplexityTestStatus.type === "loading"}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg
                         hover:bg-gray-200 transition-colors font-medium
                         disabled:opacity-50">
                {perplexityTestStatus.type === "loading"
                  ? "Testing..."
                  : "Test Connection"}
              </button>
            </div>

            {perplexityTestStatus.type === "success" && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                {perplexityTestStatus.message}
              </div>
            )}
            {perplexityTestStatus.type === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {perplexityTestStatus.message}
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
        <div className="flex flex-row gap-4">
          {/* ── LLM Fine-tuning ─────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-lg p-6 w-1/3">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                LLM Fine-tuning
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Adjust model behaviour and document generation style. Changes
                apply to the next generation.
              </p>
            </div>

            <div className="space-y-8">
              {/* ── Generation Parameters ── */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Generation Parameters
                </h3>
                <div className="space-y-5">
                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Temperature
                      </label>
                      <span className="text-sm font-mono font-semibold text-purple-600 w-10 text-right">
                        {(llmTuning ?? DEFAULT_LLM_TUNING).temperature.toFixed(
                          1
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.1"
                      value={(llmTuning ?? DEFAULT_LLM_TUNING).temperature}
                      onChange={(e) =>
                        setLlmTuning({
                          ...(llmTuning ?? DEFAULT_LLM_TUNING),
                          temperature: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>0.1 — Precise &amp; deterministic</span>
                      <span>1.5 — Creative &amp; varied</span>
                    </div>
                  </div>

                  {/* Top P */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Top P
                      </label>
                      <span className="text-sm font-mono font-semibold text-purple-600 w-10 text-right">
                        {(llmTuning ?? DEFAULT_LLM_TUNING).topP.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={(llmTuning ?? DEFAULT_LLM_TUNING).topP}
                      onChange={(e) =>
                        setLlmTuning({
                          ...(llmTuning ?? DEFAULT_LLM_TUNING),
                          topP: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>0.5 — Conservative vocabulary</span>
                      <span>1.0 — Full diversity</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Max Output Tokens
                      </label>
                      <span className="text-sm font-mono font-semibold text-purple-600 w-16 text-right">
                        {(
                          llmTuning ?? DEFAULT_LLM_TUNING
                        ).maxTokens.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1024"
                      max="8192"
                      step="256"
                      value={(llmTuning ?? DEFAULT_LLM_TUNING).maxTokens}
                      onChange={(e) =>
                        setLlmTuning({
                          ...(llmTuning ?? DEFAULT_LLM_TUNING),
                          maxTokens: parseInt(e.target.value)
                        })
                      }
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>1 024 — Concise</span>
                      <span>8 192 — Detailed &amp; long</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Analysis & Style ── */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Analysis &amp; Style
                </h3>
                <div className="space-y-5">
                  {/* Match Strictness */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Match Strictness
                    </label>
                    <p className="text-xs text-gray-400 mb-2">
                      How rigorously the AI scores your profile against the job
                      requirements.
                    </p>
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                      {(["strict", "balanced", "generous"] as const).map(
                        (opt) => (
                          <button
                            key={opt}
                            onClick={() =>
                              setLlmTuning({
                                ...(llmTuning ?? DEFAULT_LLM_TUNING),
                                matchStrictness: opt
                              })
                            }
                            className={`px-4 py-2 font-medium capitalize transition-colors
                            ${
                              (llmTuning ?? DEFAULT_LLM_TUNING)
                                .matchStrictness === opt
                                ? "bg-purple-600 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}>
                            {opt === "strict"
                              ? "Strict"
                              : opt === "balanced"
                                ? "Balanced"
                                : "Generous"}
                          </button>
                        )
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      {
                        {
                          strict:
                            "Gaps and missing skills are weighted heavily. Scores tend lower.",
                          balanced:
                            "Fair assessment — explicit requirements and transferable skills weighed equally.",
                          generous:
                            "Transferable skills and potential count. Scores tend higher."
                        }[(llmTuning ?? DEFAULT_LLM_TUNING).matchStrictness]
                      }
                    </p>
                  </div>

                  {/* Writing Tone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Writing Tone
                    </label>
                    <p className="text-xs text-gray-400 mb-2">
                      Applies to both resumes and cover letters.
                    </p>
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                      {(
                        ["formal", "professional", "conversational"] as const
                      ).map((opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            setLlmTuning({
                              ...(llmTuning ?? DEFAULT_LLM_TUNING),
                              writingTone: opt
                            })
                          }
                          className={`px-4 py-2 font-medium capitalize transition-colors
                            ${
                              (llmTuning ?? DEFAULT_LLM_TUNING).writingTone ===
                              opt
                                ? "bg-purple-600 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resume Focus */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resume Focus
                    </label>
                    <p className="text-xs text-gray-400 mb-2">
                      Which section the model leads with and emphasises most.
                    </p>
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                      {(["skills", "balanced", "experience"] as const).map(
                        (opt) => (
                          <button
                            key={opt}
                            onClick={() =>
                              setLlmTuning({
                                ...(llmTuning ?? DEFAULT_LLM_TUNING),
                                resumeFocus: opt
                              })
                            }
                            className={`px-4 py-2 font-medium transition-colors
                            ${
                              (llmTuning ?? DEFAULT_LLM_TUNING).resumeFocus ===
                              opt
                                ? "bg-purple-600 text-white"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}>
                            {opt === "skills"
                              ? "Skills-first"
                              : opt === "balanced"
                                ? "Balanced"
                                : "Experience-first"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset tuning */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setLlmTuning(DEFAULT_LLM_TUNING)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline">
                  Reset to defaults
                </button>
              </div>
            </div>
          </div>

          {/* ── Custom Prompts ─────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-lg p-6 w-2/3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Custom Prompts
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Override the system and user prompts sent to the model.
                </p>
              </div>
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
                    hint: "Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders."
                  },
                  {
                    key: "coverLetterSystemPrompt" as keyof CustomPrompts,
                    label: "Cover Letter System Prompt",
                    hint: "Defines how the AI behaves when generating cover letters."
                  },
                  {
                    key: "coverLetterUserPromptTemplate" as keyof CustomPrompts,
                    label: "Cover Letter User Prompt Template",
                    hint: "Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders."
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
        </div>
      )
    },
    {
      label: "Templates",
      value: "templates",
      content: (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Prompt Templates
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Apply a preset to instantly configure your Custom Prompts for a
              specific role type.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROMPT_TEMPLATES.map((template) => {
              const isActive = activeTemplateName === template.name
              return (
                <div
                  key={template.id}
                  className={`flex flex-col rounded-xl border-2 p-5 transition-all
                    ${
                      isActive
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {template.name}
                    </h3>
                    {isActive && (
                      <span
                        className="text-xs font-medium bg-emerald-100 text-emerald-700
                                       border border-emerald-200 rounded-full px-2 py-0.5 shrink-0 ml-2">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Tag line */}
                  <p className="text-xs text-gray-500 mb-4">
                    {template.tagLine}
                  </p>

                  {/* Bullets */}
                  <ul className="space-y-1.5 flex-1 mb-5">
                    {template.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-purple-400 mt-0.5 shrink-0">
                          •
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* Apply button */}
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={isActive}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-gray-100 text-gray-400 cursor-default"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}>
                    {isActive ? "Applied" : "Apply Template"}
                  </button>
                </div>
              )
            })}
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
          <LinkedInImportButton
            onImport={(data) => {
              setUserProfile({
                ...userProfile,
                personalInfo: {
                  fullName: data.personalInfo?.fullName || userProfile.personalInfo.fullName,
                  email: userProfile.personalInfo.email,
                  phone: userProfile.personalInfo.phone,
                  location: data.personalInfo?.location || userProfile.personalInfo.location,
                  website: data.personalInfo?.website || userProfile.personalInfo.website,
                  linkedin: data.personalInfo?.linkedin || userProfile.personalInfo.linkedin,
                  github: data.personalInfo?.github || userProfile.personalInfo.github,
                  summary: data.personalInfo?.summary || userProfile.personalInfo.summary
                },
                workExperience: mergeWorkExperience(
                  userProfile.workExperience,
                  data.workExperience
                ),
                education: mergeEducation(userProfile.education, data.education),
                skills: mergeSkills(userProfile.skills, data.skills),
                languages: mergeLanguages(userProfile.languages, data.languages)
              })
            }}
          />
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
        <div className="space-y-6">
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

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Certificates
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Certifications, online courses, bootcamps and professional
              training.
            </p>
            <CertificateEditor
              certificates={userProfile.certificates ?? []}
              onChange={(certificates) =>
                setUserProfile({ ...userProfile, certificates })
              }
            />
          </div>
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
    },
    {
      label: "Backup & Sync",
      value: "backup-sync",
      content: (
        <div className="space-y-6">
          {/* Google Drive Sync */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Google Drive Sync
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Sync your profile, settings, and saved applications across
                computers. Data is stored privately in your Google Drive app
                folder — only JobTailor can access it.
              </p>
            </div>

            {!syncConfig?.token ? (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-1">How it works</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Connect once per device with your Google account</li>
                    <li>Changes sync automatically after 2 seconds</li>
                    <li>
                      On a new device, connect and use Force Pull to restore
                    </li>
                    <li>
                      Your data is stored in a private app folder, not visible
                      in Drive
                    </li>
                  </ul>
                </div>
                <div>
                  <button
                    onClick={handleConnectDrive}
                    disabled={syncStatus.type === "loading"}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                             transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                    {syncStatus.type === "loading"
                      ? "Connecting..."
                      : "Connect Google Drive"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-800">
                      Connected
                    </span>
                  </div>
                  {syncConfig.lastSynced && (
                    <p className="text-xs text-green-700">
                      Last synced:{" "}
                      {new Date(syncConfig.lastSynced).toLocaleString()}
                    </p>
                  )}
                  {!syncConfig.lastSynced && (
                    <p className="text-xs text-green-700">
                      Sync will happen automatically when you make changes.
                    </p>
                  )}
                  {syncConfig.error && (
                    <p className="text-xs text-red-600 mt-1">
                      Last sync error: {syncConfig.error}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleForcePull}
                    disabled={syncStatus.type === "loading"}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                             transition-colors font-medium text-sm disabled:opacity-50">
                    {syncStatus.type === "loading"
                      ? "Restoring..."
                      : "Force Pull from Drive"}
                  </button>
                  <button
                    onClick={handleDisconnectDrive}
                    disabled={syncStatus.type === "loading"}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200
                             transition-colors font-medium text-sm disabled:opacity-50">
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {syncStatus.type === "success" && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                {syncStatus.message}
              </div>
            )}
            {syncStatus.type === "error" && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {syncStatus.message}
              </div>
            )}
          </div>

          {/* Manual Export/Import */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Manual Export / Import
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Download a full backup or restore from a previously exported
                file. Includes profile, settings, and all saved applications
                with generated CVs and cover letters.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportData}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700
                         transition-colors font-medium text-sm">
                Export Data
              </button>
              <button
                onClick={handleImportData}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                         transition-colors font-medium text-sm">
                Import Data
              </button>
            </div>
          </div>
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
        prompt={
          dialogState.promptKey ? customPrompts[dialogState.promptKey] : ""
        }
        onClose={closePromptDialog}
        onSave={savePromptFromDialog}
      />

      <PromptDialog
        isOpen={perplexityDialogState.isOpen}
        title={perplexityDialogState.title}
        prompt={
          perplexityDialogState.promptType === "research"
            ? perplexityConfig.customPrompt
            : perplexityDialogState.promptType === "preparation"
              ? perplexityConfig.preparationPlanPrompt
              : ""
        }
        onClose={closePerplexityDialog}
        onSave={savePerplexityPromptFromDialog}
      />
    </>
  )
}

export default Options

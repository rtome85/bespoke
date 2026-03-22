import { useCallback, useEffect, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

import { CertificateEditor } from "~components/CertificateEditor"
import { EducationEditor } from "~components/Education"
import { ExperienceEditor } from "~components/ExperienceEditor"
import { LanguageEditor } from "~components/LanguageEditor"
import { PersonalInfo } from "~components/PersonalInfo"
import { ProjectEditor } from "~components/ProjectEditor"
import { PromptDialog } from "~components/PromptDialog"
import { SkillEditor } from "~components/SkillEditor"
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

const EXTENSION_VERSION = "0.4.2"

const NAV_GROUPS = [
  {
    label: "AI PROVIDERS",
    items: [
      { label: "OLLAMA", value: "ai-settings", subtitle: "Configure API access and select your model" },
      { label: "PERPLEXITY", value: "perplexity", subtitle: "Configure company research and interview preparation" }
    ]
  },
  {
    label: "CONTENT",
    items: [
      { label: "PROMPTS", value: "prompts", subtitle: "Fine-tune model behaviour and custom prompts" },
      { label: "TEMPLATES", value: "templates", subtitle: "Apply preset prompt configurations" }
    ]
  },
  {
    label: "PROFILE",
    items: [
      { label: "PERSONAL INFO", value: "personal-info", subtitle: "Your contact and personal details" },
      { label: "EDUCATION", value: "education", subtitle: "Degrees, certificates, and training" },
      { label: "SKILLS", value: "skills", subtitle: "Technical and soft skills" },
      { label: "EXPERIENCE", value: "experience", subtitle: "Work history and achievements" },
      { label: "PROJECTS", value: "projects", subtitle: "Personal and open-source projects" },
      { label: "LANGUAGES", value: "languages", subtitle: "Languages you speak" }
    ]
  },
  {
    label: "SYSTEM",
    items: [
      { label: "BACKUP & SYNC", value: "backup-sync", subtitle: "Export, import, and Google Drive sync" }
    ]
  }
]

/**
 * Wraps useStorage with local state so text inputs don't lose cursor position.
 * Edits are immediate in local state and flushed to chrome.storage after a delay.
 */
function useDebouncedStorage<T>(
  key: string,
  defaultValue: T,
  delay = 400
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useStorage<T>(key, defaultValue)
  const [local, setLocal] = useState<T>(stored)
  const lastWriteId = useRef(0)
  const pendingWriteId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (stored === undefined) return
    if (lastWriteId.current === pendingWriteId.current) {
      setLocal(stored)
    } else {
      lastWriteId.current = pendingWriteId.current
    }
  }, [stored])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setLocal((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        if (timer.current) clearTimeout(timer.current)
        pendingWriteId.current += 1
        const writeId = pendingWriteId.current
        timer.current = setTimeout(() => {
          setStored(next)
        }, delay)
        return next
      })
    },
    [setStored, delay]
  )

  return [local, setValue]
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const card = "bg-white border-2 border-ink p-8"

const inputCls =
  "w-full px-4 py-3 bg-white border border-canvas-input-border text-ink text-sm focus:outline-none focus:border-ink transition-colors"

const textareaCls =
  "w-full px-4 py-3 bg-white border border-canvas-input-border text-ink text-sm font-mono focus:outline-none focus:border-ink transition-colors"

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary mb-2"

const hintCls = "text-[11px] text-ink-secondary mt-1"

const sectionHeadCls =
  "text-[11px] font-bold uppercase tracking-widest text-ink mb-4"

const btnOutline =
  "px-5 py-2.5 bg-white border-2 border-ink text-ink text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-colors hover:bg-canvas"

const btnAccent =
  "px-5 py-2.5 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-opacity hover:opacity-90"

const btnSecondary =
  "px-5 py-2.5 bg-sidebar-accent text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-opacity hover:opacity-90"

const successMsg =
  "bg-[#f0fdf4] border border-[#86efac] text-[#166534] px-4 py-3 text-sm"

const errorMsg =
  "bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b] px-4 py-3 text-sm"

const infoMsg =
  "bg-[#eff6ff] border border-[#93c5fd] text-[#1e40af] px-4 py-3 text-sm"

const divider = "border-0 border-t border-canvas-divide my-6"

function Options() {
  const [activeTab, setActiveTab] = useState("ai-settings")

  const [userProfile, setUserProfile] = useDebouncedStorage<UserProfile>(
    "userProfile",
    DEFAULT_USER_PROFILE
  )

  const [ollamaConfig, setOllamaConfig] = useDebouncedStorage("ollamaConfig", {
    apiKey: "",
    baseUrl: "https://ollama.com/api",
    enabled: false
  })

  const [perplexityConfig, setPerplexityConfig] = useDebouncedStorage<PerplexityConfig>(
    "perplexityConfig",
    {
      apiKey: "",
      enabled: false,
      customPrompt: DEFAULT_PERPLEXITY_PROMPT,
      preparationPlanEnabled: false,
      preparationPlanPrompt: DEFAULT_PREPARATION_PLAN_PROMPT
    }
  )

  const [customPrompts, setCustomPrompts] = useDebouncedStorage<CustomPrompts>(
    "customPrompts",
    DEFAULT_PROMPTS
  )

  const [llmTuning, setLlmTuning] = useDebouncedStorage<LLMTuningConfig>(
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
      chrome.storage.local.set({
        customPrompts: DEFAULT_PROMPTS,
        promptsVersion: PROMPTS_VERSION
      })
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
      userProfile,
      llmTuning
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
      a.download = `bespoke-export-${new Date().toISOString().split("T")[0]}.json`
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

  // ── Active nav info ──────────────────────────────────────────────────────────
  const allNavItems = NAV_GROUPS.flatMap((g) => g.items)
  const activeNav = allNavItems.find((i) => i.value === activeTab)

  // ── Tab content ──────────────────────────────────────────────────────────────
  const tabContent: Record<string, React.ReactNode> = {
    "ai-settings": (
      <div className={card}>
        <h2 className={sectionHeadCls}>Ollama Configuration</h2>
        <hr className={divider} />

        <div className="space-y-6">
          <div>
            <label className={labelCls}>API Key *</label>
            <input
              type="password"
              value={ollamaConfig.apiKey}
              onChange={(e) =>
                setOllamaConfig({ ...ollamaConfig, apiKey: e.target.value })
              }
              placeholder="oll-..."
              className={inputCls}
            />
            <p className={hintCls}>
              Get your API key from{" "}
              <a
                href="https://ollama.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sidebar-accent hover:underline">
                ollama.com/settings/keys
              </a>
            </p>
          </div>

          <div>
            <label className={labelCls}>Base URL</label>
            <input
              type="text"
              value={ollamaConfig.baseUrl}
              onChange={(e) =>
                setOllamaConfig({ ...ollamaConfig, baseUrl: e.target.value })
              }
              placeholder="https://ollama.com/api"
              className={inputCls}
            />
            <p className={hintCls}>Default is fine for most users.</p>
          </div>

          <div>
            <label className={labelCls}>Available Models</label>
            <div className="bg-canvas border border-canvas-input-border p-4">
              <div className="space-y-3">
                {AVAILABLE_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{model.name}</span>
                      {model.recommended && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-sidebar-accent text-white px-2 py-0.5">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-ink-muted text-xs">{model.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTestOllama}
              disabled={testStatus.type === "loading"}
              className={btnOutline}>
              {testStatus.type === "loading" ? "Testing..." : "Test Connection"}
            </button>
          </div>

          {testStatus.type === "success" && (
            <div className={successMsg}>{testStatus.message}</div>
          )}
          {testStatus.type === "error" && (
            <div className={errorMsg}>{testStatus.message}</div>
          )}
        </div>
      </div>
    ),

    perplexity: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Perplexity Sonar Configuration</h2>
        <p className="text-sm text-ink-secondary mb-6">
          Configure Perplexity Sonar to research companies and display
          information in the results. This enables the "About Company" section
          with industry, size, projects, and ratings from Glassdoor, Indeed, and
          Teamlyzer.
        </p>
        <hr className={divider} />

        <div className="space-y-6">
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
              className="w-4 h-4 accent-sidebar-accent"
            />
            <label
              htmlFor="perplexityEnabled"
              className="text-sm font-medium text-ink">
              Enable Company Research
            </label>
          </div>

          <div>
            <label className={labelCls}>API Key *</label>
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
              className={inputCls}
            />
            <p className={hintCls}>
              Get your API key from{" "}
              <a
                href="https://www.perplexity.ai/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sidebar-accent hover:underline">
                perplexity.ai/settings/api
              </a>
            </p>
          </div>

          <div>
            <label className={labelCls}>Research Prompt</label>
            <textarea
              value={perplexityConfig.customPrompt}
              onChange={(e) =>
                setPerplexityConfig({
                  ...perplexityConfig,
                  customPrompt: e.target.value
                })
              }
              rows={6}
              className={textareaCls}
            />
            <div className="flex items-center justify-between mt-1">
              <p className={hintCls}>
                Use {"{{companyName}}"} as a placeholder for the company name.
              </p>
              <button
                onClick={() => openPerplexityDialog("Research Prompt", "research")}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-sidebar-accent text-white border-0 hover:opacity-90 transition-opacity">
                Expand
              </button>
            </div>
          </div>

          <hr className={divider} />

          <div>
            <h3 className={sectionHeadCls}>Interview Preparation Plan</h3>
            <p className="text-sm text-ink-secondary mb-4">
              Generate AI-powered technical interview preparation plans for HR
              and technical interviews.
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
                  className="w-4 h-4 accent-sidebar-accent"
                />
                <label
                  htmlFor="preparationPlanEnabled"
                  className="text-sm font-medium text-ink">
                  Enable Preparation Plan Generation
                </label>
              </div>

              <div>
                <label className={labelCls}>Preparation Plan Prompt</label>
                <textarea
                  value={perplexityConfig.preparationPlanPrompt}
                  onChange={(e) =>
                    setPerplexityConfig({
                      ...perplexityConfig,
                      preparationPlanPrompt: e.target.value
                    })
                  }
                  rows={8}
                  className={textareaCls}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={hintCls}>
                    Use {"{{companyName}}"}, {"{{jobTitle}}"},{" "}
                    {"{{jobDescription}}"}, and {"{{interviewType}}"} as placeholders.
                  </p>
                  <button
                    onClick={() =>
                      openPerplexityDialog("Preparation Plan Prompt", "preparation")
                    }
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-sidebar-accent text-white border-0 hover:opacity-90 transition-opacity">
                    Expand
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={infoMsg}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">
              Pricing
            </h3>
            <p className="text-xs">
              Perplexity Sonar costs $1 per 1M input tokens and $1 per 1M output
              tokens. A typical company research query costs approximately $0.0008.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTestPerplexity}
              disabled={perplexityTestStatus.type === "loading"}
              className={btnOutline}>
              {perplexityTestStatus.type === "loading"
                ? "Testing..."
                : "Test Connection"}
            </button>
          </div>

          {perplexityTestStatus.type === "success" && (
            <div className={successMsg}>{perplexityTestStatus.message}</div>
          )}
          {perplexityTestStatus.type === "error" && (
            <div className={errorMsg}>{perplexityTestStatus.message}</div>
          )}
        </div>
      </div>
    ),

    prompts: (
      <div className="flex flex-row gap-6">
        {/* LLM Fine-tuning */}
        <div className={`${card} w-1/3`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={sectionHeadCls}>LLM Fine-tuning</h2>
              <p className="text-sm text-ink-secondary">
                Adjust model behaviour and document generation style. Changes apply
                to the next generation.
              </p>
            </div>
            <button
              onClick={() => setLlmTuning(DEFAULT_LLM_TUNING)}
              className={btnOutline}>
              Reset to Defaults
            </button>
          </div>
          <hr className={divider} />

          <div className="space-y-8">
            <div>
              <h3 className={sectionHeadCls}>Generation Parameters</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-ink">
                      Temperature
                    </label>
                    <span className="text-sm font-mono font-semibold text-sidebar-accent w-10 text-right">
                      {(llmTuning ?? DEFAULT_LLM_TUNING).temperature.toFixed(1)}
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
                    className="w-full accent-sidebar-accent"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                    <span>0.1 — Precise</span>
                    <span>1.5 — Creative</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-ink">
                      Top P
                    </label>
                    <span className="text-sm font-mono font-semibold text-sidebar-accent w-10 text-right">
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
                    className="w-full accent-sidebar-accent"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                    <span>0.5 — Conservative</span>
                    <span>1.0 — Full diversity</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-ink">
                      Max Output Tokens
                    </label>
                    <span className="text-sm font-mono font-semibold text-sidebar-accent w-16 text-right">
                      {(llmTuning ?? DEFAULT_LLM_TUNING).maxTokens.toLocaleString()}
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
                    className="w-full accent-sidebar-accent"
                  />
                  <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                    <span>1 024 — Concise</span>
                    <span>8 192 — Detailed</span>
                  </div>
                </div>
              </div>
            </div>

            <hr className={divider} />

            <div>
              <h3 className={sectionHeadCls}>Analysis &amp; Style</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Profile Match Strictness
                  </label>
                  <p className="text-[11px] text-ink-muted mb-2">
                    How rigorously the AI scores your profile against requirements.
                  </p>
                  <div className="inline-flex border-2 border-ink overflow-hidden text-sm">
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
                          className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors
                          ${(llmTuning ?? DEFAULT_LLM_TUNING).matchStrictness === opt
                              ? "bg-ink text-white"
                              : "bg-white text-ink hover:bg-canvas"
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
                  <p className="mt-2 text-[11px] text-ink-muted">
                    {
                      {
                        strict: "Gaps and missing skills are weighted heavily.",
                        balanced: "Explicit requirements and transferable skills weighed equally.",
                        generous: "Transferable skills and potential count."
                      }[(llmTuning ?? DEFAULT_LLM_TUNING).matchStrictness]
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Writing Tone
                  </label>
                  <p className="text-[11px] text-ink-muted mb-2">
                    Applies to both resumes and cover letters.
                  </p>
                  <div className="inline-flex border-2 border-ink overflow-hidden text-sm">
                    {(["formal", "professional", "conversational"] as const).map(
                      (opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            setLlmTuning({
                              ...(llmTuning ?? DEFAULT_LLM_TUNING),
                              writingTone: opt
                            })
                          }
                          className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors
                          ${(llmTuning ?? DEFAULT_LLM_TUNING).writingTone === opt
                              ? "bg-ink text-white"
                              : "bg-white text-ink hover:bg-canvas"
                            }`}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Resume Focus
                  </label>
                  <p className="text-[11px] text-ink-muted mb-2">
                    Which section the model leads with and emphasises most.
                  </p>
                  <div className="inline-flex border-2 border-ink overflow-hidden text-sm">
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
                          className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors
                          ${(llmTuning ?? DEFAULT_LLM_TUNING).resumeFocus === opt
                              ? "bg-ink text-white"
                              : "bg-white text-ink hover:bg-canvas"
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

          </div>
        </div>

        {/* Custom Prompts */}
        <div className={`${card} flex-1`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={sectionHeadCls}>Custom Prompts</h2>
              <p className="text-sm text-ink-secondary">
                Override the system and user prompts sent to the model.
              </p>
            </div>
            <button
              onClick={handleResetPrompts}
              className={btnOutline}>
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
                <label className={labelCls}>{label}</label>
                <textarea
                  value={customPrompts[key]}
                  onChange={(e) => handlePromptChange(key, e.target.value)}
                  rows={4}
                  className={textareaCls}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={hintCls}>{hint}</p>
                  <button
                    onClick={() => openPromptDialog(label, key)}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-sidebar-accent text-white border-0 hover:opacity-90 transition-opacity">
                    Expand
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    templates: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Prompt Templates</h2>
        <p className="text-sm text-ink-secondary mb-6">
          Apply a preset to instantly configure your Custom Prompts for a
          specific role type.
        </p>
        <hr className={divider} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROMPT_TEMPLATES.map((template) => {
            const isActive = activeTemplateName === template.name
            return (
              <div
                key={template.id}
                className={`flex flex-col border-2 p-5 transition-all
                  ${isActive ? "border-sidebar-accent bg-[#fdf5f2]" : "border-canvas-input-border bg-white hover:border-ink"}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-ink text-sm">
                    {template.name}
                  </h3>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f0fdf4] text-[#166534] border border-[#86efac] px-2 py-0.5 shrink-0 ml-2">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-secondary mb-4">
                  {template.tagLine}
                </p>

                <ul className="space-y-1.5 flex-1 mb-5">
                  {template.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-xs text-ink-secondary">
                      <span className="text-sidebar-accent mt-0.5 shrink-0">
                        •
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleApplyTemplate(template)}
                  disabled={isActive}
                  className={`w-full py-2 text-[11px] font-bold uppercase tracking-widest transition-colors
                    ${isActive
                      ? "bg-canvas text-ink-muted cursor-default border border-canvas-input-border"
                      : "bg-sidebar-accent text-white border-0 hover:opacity-90"
                    }`}>
                  {isActive ? "Applied" : "Apply Template"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    ),

    "personal-info": (
      <div className={card}>
        <h2 className={sectionHeadCls}>Personal Information</h2>
        <hr className={divider} />
        <PersonalInfo
          personalInfo={userProfile.personalInfo}
          onChange={(personalInfo) =>
            setUserProfile({ ...userProfile, personalInfo })
          }
        />
      </div>
    ),

    education: (
      <div className="space-y-6">
        <div className={card}>
          <h2 className={sectionHeadCls}>Education</h2>
          <hr className={divider} />
          <EducationEditor
            education={userProfile.education}
            onChange={(education) =>
              setUserProfile({ ...userProfile, education })
            }
          />
        </div>

        <div className={card}>
          <h2 className={sectionHeadCls}>Certificates</h2>
          <p className="text-sm text-ink-secondary mb-4">
            Certifications, online courses, bootcamps and professional training.
          </p>
          <CertificateEditor
            certificates={userProfile.certificates ?? []}
            onChange={(certificates) =>
              setUserProfile({ ...userProfile, certificates })
            }
          />
        </div>
      </div>
    ),

    skills: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Skills &amp; Expertise</h2>
        <hr className={divider} />
        <SkillEditor
          skills={userProfile.skills}
          onChange={(skills) => setUserProfile({ ...userProfile, skills })}
        />
      </div>
    ),

    experience: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Work Experience</h2>
        <hr className={divider} />
        <ExperienceEditor
          experiences={userProfile.workExperience}
          onChange={(workExperience) =>
            setUserProfile({ ...userProfile, workExperience })
          }
        />
      </div>
    ),

    projects: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Personal Projects</h2>
        <hr className={divider} />
        <ProjectEditor
          projects={userProfile.personalProjects}
          onChange={(personalProjects) =>
            setUserProfile({ ...userProfile, personalProjects })
          }
        />
      </div>
    ),

    languages: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Languages</h2>
        <hr className={divider} />
        <LanguageEditor
          languages={userProfile.languages}
          onChange={(languages) =>
            setUserProfile({ ...userProfile, languages })
          }
        />
      </div>
    ),

    "backup-sync": (
      <div className="space-y-6">
        <div className={card}>
          <h2 className={sectionHeadCls}>Google Drive Sync</h2>
          <p className="text-sm text-ink-secondary mb-6">
            Sync your profile, settings, and saved applications across
            computers. Data is stored privately in your Google Drive app
            folder — only Bespoke can access it.
          </p>
          <hr className={divider} />

          {!syncConfig?.token ? (
            <div className="flex flex-col gap-4">
              <div className={infoMsg}>
                <p className="font-semibold text-[11px] uppercase tracking-widest mb-2">
                  How it works
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Connect once per device with your Google account</li>
                  <li>Changes sync automatically after 2 seconds</li>
                  <li>On a new device, connect and use Force Pull to restore</li>
                  <li>
                    Your data is stored in a private app folder, not visible in
                    Drive
                  </li>
                </ul>
              </div>
              <div>
                <button
                  onClick={handleConnectDrive}
                  disabled={syncStatus.type === "loading"}
                  className="px-6 py-3 bg-[#1d4ed8] text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 hover:bg-[#1e40af] transition-colors">
                  {syncStatus.type === "loading"
                    ? "Connecting..."
                    : "Connect Google Drive"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-[#f0fdf4] border border-[#86efac] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#166534]">
                    Connected
                  </span>
                </div>
                {syncConfig.lastSynced && (
                  <p className="text-xs text-[#166534]">
                    Last synced:{" "}
                    {new Date(syncConfig.lastSynced).toLocaleString()}
                  </p>
                )}
                {!syncConfig.lastSynced && (
                  <p className="text-xs text-[#166534]">
                    Sync will happen automatically when you make changes.
                  </p>
                )}
                {syncConfig.error && (
                  <p className="text-xs text-[#991b1b] mt-1">
                    Last sync error: {syncConfig.error}
                  </p>
                )}
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleForcePull}
                  disabled={syncStatus.type === "loading"}
                  className={btnAccent}>
                  {syncStatus.type === "loading"
                    ? "Restoring..."
                    : "Force Pull from Drive"}
                </button>
                <button
                  onClick={handleDisconnectDrive}
                  disabled={syncStatus.type === "loading"}
                  className={btnSecondary}>
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {syncStatus.type === "success" && (
            <div className={`mt-4 ${successMsg}`}>{syncStatus.message}</div>
          )}
          {syncStatus.type === "error" && (
            <div className={`mt-4 ${errorMsg}`}>{syncStatus.message}</div>
          )}
        </div>

        <div className={card}>
          <h2 className={sectionHeadCls}>Manual Export / Import</h2>
          <p className="text-sm text-ink-secondary mb-6">
            Download a full backup or restore from a previously exported file.
            Includes profile, settings, and all saved applications with
            generated CVs and cover letters.
          </p>
          <hr className={divider} />
          <div className="flex gap-3">
            <button
              onClick={handleExportData}
              className="px-5 py-2.5 bg-[#16a34a] text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#15803d] transition-colors">
              Export Data
            </button>
            <button
              onClick={handleImportData}
              className="px-5 py-2.5 bg-[#1d4ed8] text-white border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#1e40af] transition-colors">
              Import Data
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col min-h-screen bg-canvas">
        {/* ── Topbar ──────────────────────────────────────────────────────── */}
        <div className="bg-sidebar border-b-2 border-sidebar-accent px-8 py-8 h-[52px] flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold text-[13px] tracking-[0.12em]">
              BESPOKE
            </span>
            <span className="text-sidebar-accent text-[11px]">
              v{EXTENSION_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleSaveSettings} className={btnAccent}>
              Save Settings
            </button>
            {saveStatus && (
              <span className="text-[#166534] text-xs font-semibold">
                {saveStatus}
              </span>
            )}
          </div>
        </div>

        {/* ── Sidebar + Main ───────────────────────────────────────────────── */}
        <div className="flex flex-1">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="flex-shrink-0 flex flex-col overflow-y-auto w-60 min-h-screen bg-sidebar sticky top-0 h-screen">
            {/* Nav */}
            <nav className="flex-1 pt-4 pb-6">
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label}>
                  {gi > 0 && (
                    <div className="h-px bg-sidebar-hover my-2" />
                  )}
                  <div className="text-sidebar-label text-[10px] font-semibold tracking-[0.1em] px-5 pt-3 pb-1">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const isActive = activeTab === item.value
                    return (
                      <button
                        key={item.value}
                        onClick={() => setActiveTab(item.value)}
                        className={`block w-full text-left py-[10px] pr-5 pl-[17px] text-[11px] font-semibold tracking-[0.08em] cursor-pointer border-0 border-solid border-l-4 outline-none transition-colors ${isActive
                          ? "bg-sidebar-hover text-white border-l-sidebar-accent"
                          : "bg-transparent text-sidebar-item border-l-transparent"
                          }`}>
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>
          </aside>

          {/* ── Main area ───────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-screen">
            {/* Top bar */}
            <div className="bg-canvas px-12 py-5">
              <h1 className="text-2xl text-ink font-bold tracking-[0.1em] m-0 uppercase">
                {activeNav?.label ?? ""}
              </h1>
              <p className="text-ink-secondary text-xs mt-[3px]">
                {activeNav?.subtitle ?? ""}
              </p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-12 pb-12">
              {tabContent[activeTab]}
            </div>

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

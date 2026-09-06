import {
  Briefcase,
  CloudCog,
  FileText,
  Folder,
  Globe,
  GraduationCap,
  Languages as LanguagesIcon,
  Server,
  SlidersHorizontal,
  User,
  Zap
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { AppBar, type AppSection } from "~components/AppBar"
import { CertificateEditor } from "~components/CertificateEditor"
import { EducationEditor } from "~components/Education"
import { ExperienceEditor } from "~components/ExperienceEditor"
import { LanguageEditor } from "~components/LanguageEditor"
import { PersonalInfo } from "~components/PersonalInfo"
import { ProjectEditor } from "~components/ProjectEditor"
import { PromptDialog } from "~components/PromptDialog"
import { SettingsRail } from "~components/SettingsRail"
import { SkillEditor } from "~components/SkillEditor"
import { Spectrum } from "~components/Spectrum"
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

const NAV_GROUPS = [
  {
    label: "AI Models",
    items: [
      {
        label: "Ollama",
        value: "ai-settings",
        subtitle: "Connection, model and generation parameters",
        icon: Server
      },
      {
        label: "Perplexity",
        value: "perplexity",
        subtitle: "Company research and interview data",
        icon: Globe
      }
    ]
  },
  {
    label: "Generation",
    items: [
      {
        label: "Output style",
        value: "output-style",
        subtitle: "How the AI scores and writes",
        icon: SlidersHorizontal
      },
      {
        label: "Prompts",
        value: "prompts",
        subtitle: "Presets and the raw text sent to the model",
        icon: FileText
      }
    ]
  },
  {
    label: "Profile",
    items: [
      {
        label: "Personal info",
        value: "personal-info",
        subtitle: "Your contact and personal details",
        icon: User
      },
      {
        label: "Education",
        value: "education",
        subtitle: "Degrees, certificates, and training",
        icon: GraduationCap
      },
      {
        label: "Skills",
        value: "skills",
        subtitle: "Technical and soft skills",
        icon: Zap
      },
      {
        label: "Experience",
        value: "experience",
        subtitle: "Work history and achievements",
        icon: Briefcase
      },
      {
        label: "Projects",
        value: "projects",
        subtitle: "Personal and open-source projects",
        icon: Folder
      },
      {
        label: "Languages",
        value: "languages",
        subtitle: "Languages you speak",
        icon: LanguagesIcon
      }
    ]
  },
  {
    label: "System",
    items: [
      {
        label: "Backup & sync",
        value: "backup-sync",
        subtitle: "Export, import, and Google Drive sync",
        icon: CloudCog
      }
    ]
  }
]

/**
 * Manages a chrome.storage.local key with local state so text inputs don't
 * lose cursor position. Edits are immediate in local state and flushed to
 * chrome.storage after a delay.
 */
function useDebouncedStorage<T>(
  key: string,
  defaultValue: T,
  delay = 400
): [T, (value: T | ((prev: T) => T)) => void] {
  const [local, setLocal] = useState<T>(defaultValue)
  const pendingWriteId = useRef(0)
  const lastWriteId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  // Load initial value from storage
  useEffect(() => {
    chrome.storage.local.get(key, (res) => {
      if (res[key] !== undefined) setLocal(res[key] as T)
    })
  }, [key])

  // Sync external storage changes (e.g. from pull)
  useEffect(() => {
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local" || !(key in changes)) return
      if (lastWriteId.current === pendingWriteId.current) {
        setLocal(changes[key].newValue as T)
      } else {
        lastWriteId.current = pendingWriteId.current
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setLocal((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        if (timer.current) clearTimeout(timer.current)
        pendingWriteId.current += 1
        timer.current = setTimeout(() => {
          chrome.storage.local.set({ [key]: next })
        }, delay)
        return next
      })
    },
    [key, delay]
  )

  return [local, setValue]
}

// ── Style helpers (ApplyAI tokens) ────────────────────────────────────────────
const card = "bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6"

const inputCls =
  "w-full px-3 py-[10px] bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm focus:outline-none focus:border-aa-primary transition-colors"

const textareaCls =
  "w-full px-3 py-[10px] bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-secondary text-xs font-mono leading-relaxed focus:outline-none focus:border-aa-primary transition-colors"

const labelCls =
  "block text-[12px] font-semibold text-aa-text-secondary mb-2"

const hintCls = "text-[11px] text-aa-text-secondary mt-1"

const sectionHeadCls =
  "text-[16px] font-semibold tracking-[-0.2px] text-aa-text-primary mb-3"

const btnOutline =
  "px-4 py-[9px] bg-aa-surface border border-aa-primary text-aa-primary rounded-aa-md text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors hover:bg-aa-primary-soft"

const btnAccent =
  "px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors hover:bg-aa-primary-hover"

const btnSecondary =
  "px-4 py-[9px] bg-aa-surface border border-aa-border text-aa-text-secondary rounded-aa-md text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors hover:bg-aa-neutral-100"

const successMsg =
  "bg-aa-success-soft text-aa-success-strong px-4 py-3 rounded-aa-md text-sm"

const errorMsg =
  "bg-aa-error-soft text-aa-error-strong px-4 py-3 rounded-aa-md text-sm"

const infoMsg =
  "bg-aa-neutral-50 border border-aa-border text-aa-neutral-700 px-4 py-3 rounded-aa-md text-sm"

const divider = "border-0 border-t border-aa-border my-5"

const costBadgeCls: Record<"low" | "medium" | "high", string> = {
  low: "bg-aa-success-soft text-aa-success-strong border-aa-success-strong",
  medium: "bg-aa-neutral-100 text-aa-text-secondary border-aa-border",
  high: "bg-aa-error-soft text-aa-error-strong border-aa-error-strong"
}

const speedBadgeCls: Record<"fast" | "medium" | "slow", string> = {
  fast: "bg-aa-success-soft text-aa-success-strong border-aa-success-strong",
  medium: "bg-aa-neutral-100 text-aa-text-secondary border-aa-border",
  slow: "bg-aa-warning-soft text-aa-warning-strong border-aa-warning-strong"
}

const scoringBadgeCls: Record<"strict" | "balanced" | "generous", string> = {
  strict: "bg-aa-error-soft text-aa-error-strong border-aa-error-strong",
  balanced: "bg-aa-neutral-100 text-aa-text-secondary border-aa-border",
  generous: "bg-aa-success-soft text-aa-success-strong border-aa-success-strong"
}

// Output style — the three spectrum/segment axes.
const STRICTNESS = ["strict", "balanced", "generous"] as const
const TONE = ["formal", "professional", "conversational"] as const
const FOCUS = ["skills", "balanced", "experience"] as const

const STRICTNESS_NOTE: Record<(typeof STRICTNESS)[number], string> = {
  strict:
    "Rigorous — gaps and missing must-haves are weighted heavily; a single unmet requirement can drop the score sharply.",
  balanced:
    "Balanced — explicit requirements and transferable skills weigh equally. A missing must-have costs about 10 points.",
  generous:
    "Lenient — transferable skills and potential count for a lot; only large gaps move the score much."
}

// Static preview of a résumé bullet per tone × focus — no model call.
const SAMPLE_BULLETS: Record<
  (typeof TONE)[number],
  Record<(typeof FOCUS)[number], string>
> = {
  formal: {
    skills:
      "Applied React and TypeScript to deliver a production checkout flow, achieving a 12% uplift in conversion.",
    balanced:
      "Led a team of six engineers in rebuilding the checkout flow in React and TypeScript, improving conversion by 12%.",
    experience:
      "As Lead Engineer, directed the checkout rebuild across a six-person team, delivering a 12% conversion gain."
  },
  professional: {
    skills:
      "Built the checkout flow in React and TypeScript, lifting conversion 12% and cutting page weight by a third.",
    balanced:
      "Led a team of six engineers to rebuild the checkout flow in React and TypeScript, lifting conversion 12% and cutting page weight by a third.",
    experience:
      "Led a six-engineer team through the checkout rebuild — shipped in two quarters, +12% conversion, −33% page weight."
  },
  conversational: {
    skills:
      "Rebuilt checkout in React + TypeScript and got conversion up 12% while trimming a third of the page weight.",
    balanced:
      "Ran a six-person team to rebuild checkout in React + TypeScript — conversion went up 12% and the page got a third lighter.",
    experience:
      "Led six engineers through the checkout rebuild; we shipped in two quarters and conversion jumped 12%."
  }
}

function Options() {
  const [section, setSection] = useState<AppSection>("settings")
  const [activeTab, setActiveTab] = useState("ai-settings")

  useEffect(() => {
    chrome.storage.local.get("optionsSection", (res) => {
      if (res.optionsSection === "applications" || res.optionsSection === "settings") {
        setSection(res.optionsSection)
      }
    })
  }, [])

  const changeSection = (next: AppSection) => {
    setSection(next)
    chrome.storage.local.set({ optionsSection: next })
  }

  const [userProfile, setUserProfile] = useDebouncedStorage<UserProfile>(
    "userProfile",
    DEFAULT_USER_PROFILE
  )

  const [ollamaConfig, setOllamaConfig] = useDebouncedStorage("ollamaConfig", {
    apiKey: "",
    baseUrl: "https://ollama.com/api",
    enabled: false
  })

  const [perplexityConfig, setPerplexityConfig] =
    useDebouncedStorage<PerplexityConfig>("perplexityConfig", {
      apiKey: "",
      enabled: false,
      customPrompt: DEFAULT_PERPLEXITY_PROMPT,
      preparationPlanEnabled: false,
      preparationPlanPrompt: DEFAULT_PREPARATION_PLAN_PROMPT
    })

  const [customPrompts, setCustomPrompts] = useDebouncedStorage<CustomPrompts>(
    "customPrompts",
    DEFAULT_PROMPTS
  )

  const [llmTuning, setLlmTuning] = useDebouncedStorage<LLMTuningConfig>(
    "llmTuning",
    DEFAULT_LLM_TUNING
  )

  const [matchModel, setMatchModel] = useDebouncedStorage<string>(
    "lastSelectedModel",
    "gpt-oss:20b-cloud"
  )

  useEffect(() => {
    chrome.storage.local.get("promptsVersion", (res) => {
      if (res.promptsVersion !== PROMPTS_VERSION) {
        chrome.storage.local.set({
          customPrompts: DEFAULT_PROMPTS,
          promptsVersion: PROMPTS_VERSION
        })
        setCustomPrompts(DEFAULT_PROMPTS)
      }
    })
  }, [])

  const [testStatus, setTestStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    message: string
  }>({ type: "idle", message: "" })

  const [perplexityTestStatus, setPerplexityTestStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    message: string
  }>({ type: "idle", message: "" })

  const [saveStatus, setSaveStatus] = useState("")

  const [syncConfig, setSyncConfigState] = useState<SyncConfig | null>(null)
  useEffect(() => {
    chrome.storage.local.get("syncConfig", (res) => {
      setSyncConfigState(res.syncConfig ?? null)
    })
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes.syncConfig) {
        setSyncConfigState(changes.syncConfig.newValue ?? null)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])
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
      llmTuning,
      lastSelectedModel: matchModel
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
        lastSelectedModel: matchModel,
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
          if (data.lastSelectedModel) setMatchModel(data.lastSelectedModel)
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
      await chrome.storage.local.set({
        syncConfig: { token, lastSynced: null }
      })
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
      await chrome.storage.local.set({
        syncConfig: { ...syncConfig, lastSynced: new Date().toISOString() }
      })
      const pulled = await chrome.storage.local.get([
        "userProfile",
        "ollamaConfig",
        "perplexityConfig",
        "customPrompts",
        "llmTuning"
      ])
      await chrome.storage.local.set(pulled)
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
      await chrome.storage.local.remove("syncConfig")
      setSyncStatus({ type: "idle", message: "" })
    }
  }

  // ── Active nav info ──────────────────────────────────────────────────────────
  const allNavItems = NAV_GROUPS.flatMap((g) => g.items)
  const activeNav = allNavItems.find((i) => i.value === activeTab)

  // ── Tab content ──────────────────────────────────────────────────────────────
  const tabContent: Record<string, React.ReactNode> = {
    "ai-settings": (
      <div className="space-y-6">
        {/* Connection */}
        <div className={card}>
          <h2 className={sectionHeadCls}>Connection</h2>
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
                  className="text-aa-primary hover:underline">
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

            <div className="flex gap-3">
              <button
                onClick={handleTestOllama}
                disabled={testStatus.type === "loading"}
                className={btnOutline}>
                {testStatus.type === "loading"
                  ? "Testing..."
                  : "Test Connection"}
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

        {/* Model */}
        <div className={card}>
          <h2 className={sectionHeadCls}>Model</h2>
          <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
            The model used to score your profile and draft documents.
          </p>
          <hr className={divider} />
          <div className="space-y-3">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = matchModel === model.id
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setMatchModel(model.id)}
                  className={`w-full text-left p-4 rounded-aa-md border transition-colors ${
                    isSelected
                      ? "border-aa-primary bg-aa-primary-soft"
                      : "border-aa-border bg-aa-surface hover:border-aa-neutral-400"
                  }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-aa-text-primary text-sm">
                        {model.name}
                      </span>
                      <span className="text-aa-text-secondary text-xs">
                        {model.size}
                      </span>
                      {model.recommended && (
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded-aa-pill bg-aa-primary-soft text-aa-primary px-2 py-0.5">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        isSelected
                          ? "border-aa-primary bg-aa-primary"
                          : "border-aa-neutral-400"
                      }`}
                    />
                  </div>

                  <p className="text-sm text-aa-text-secondary mt-1.5">
                    {model.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-2 py-0.5 border ${costBadgeCls[model.costProfile]}`}>
                      Token cost: {model.costProfile}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-2 py-0.5 border ${speedBadgeCls[model.speedProfile]}`}>
                      Speed: {model.speedProfile}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-2 py-0.5 border ${scoringBadgeCls[model.scoringProfile]}`}>
                      Scoring: {model.scoringProfile}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fine-tuning */}
        <div className={card}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={sectionHeadCls}>Fine-tuning</h2>
              <p className="text-sm text-aa-text-secondary -mt-1">
                Generation parameters. Defaults suit most cases.
              </p>
            </div>
            <button
              onClick={() => setLlmTuning(DEFAULT_LLM_TUNING)}
              className={btnOutline}>
              Reset to defaults
            </button>
          </div>
          <hr className={divider} />
          <div className="space-y-5">
            {[
              {
                label: "Temperature",
                key: "temperature" as const,
                min: 0.1,
                max: 1.5,
                step: 0.1,
                fmt: (v: number) => v.toFixed(1),
                lo: "0.1 — Precise",
                hi: "1.5 — Creative"
              },
              {
                label: "Top P",
                key: "topP" as const,
                min: 0.5,
                max: 1.0,
                step: 0.05,
                fmt: (v: number) => v.toFixed(2),
                lo: "0.5 — Conservative",
                hi: "1.0 — Full diversity"
              },
              {
                label: "Max output tokens",
                key: "maxTokens" as const,
                min: 1024,
                max: 8192,
                step: 256,
                fmt: (v: number) => v.toLocaleString(),
                lo: "1 024 — Concise",
                hi: "8 192 — Detailed"
              }
            ].map(({ label, key, min, max, step, fmt, lo, hi }) => {
              const tuning = llmTuning ?? DEFAULT_LLM_TUNING
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-aa-text-primary">
                      {label}
                    </label>
                    <span className="text-sm font-mono font-semibold text-aa-primary-pressed">
                      {fmt(tuning[key])}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={tuning[key]}
                    onChange={(e) =>
                      setLlmTuning({
                        ...tuning,
                        [key]:
                          key === "maxTokens"
                            ? parseInt(e.target.value, 10)
                            : parseFloat(e.target.value)
                      })
                    }
                    className="w-full accent-aa-primary"
                  />
                  <div className="flex justify-between text-[10px] text-aa-text-secondary mt-0.5">
                    <span>{lo}</span>
                    <span>{hi}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    ),

    perplexity: (
      <div className={card}>
        <h2 className={sectionHeadCls}>Perplexity Sonar Configuration</h2>
        <p className="text-sm text-aa-text-secondary mb-6">
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
              className="w-4 h-4 accent-aa-primary"
            />
            <label
              htmlFor="perplexityEnabled"
              className="text-sm font-medium text-aa-text-primary">
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
                className="text-aa-primary hover:underline">
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
                onClick={() =>
                  openPerplexityDialog("Research Prompt", "research")
                }
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-aa-primary text-aa-text-on-primary border-0 hover:opacity-90 transition-opacity">
                Expand
              </button>
            </div>
          </div>

          <div className={infoMsg}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">
              Pricing
            </h3>
            <p className="text-xs">
              Perplexity Sonar costs $1 per 1M input tokens and $1 per 1M output
              tokens. A typical company research query costs approximately
              $0.0008.
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
      <div className="space-y-6">
        {/* Start from a preset */}
        <div className={card}>
          <h2 className={sectionHeadCls}>Start from a preset</h2>
          <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
            Applying a preset overwrites the custom prompts below.
          </p>
          <hr className={divider} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROMPT_TEMPLATES.map((template) => {
              const isActive = activeTemplateName === template.name
              return (
                <div
                  key={template.id}
                  className={`flex flex-col rounded-aa-md border p-4 transition-colors ${
                    isActive
                      ? "border-aa-primary bg-aa-primary-soft"
                      : "border-aa-border bg-aa-surface hover:border-aa-neutral-400"
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-aa-text-primary text-[13px]">
                      {template.name}
                    </h3>
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-aa-pill bg-aa-success-soft text-aa-success-strong px-2 py-0.5 shrink-0 ml-2">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-aa-text-secondary mb-3">
                    {template.tagLine}
                  </p>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {template.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-xs text-aa-text-secondary">
                        <span className="text-aa-primary mt-0.5 shrink-0">•</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={isActive}
                    className={`w-full py-2 rounded-aa-md text-[12px] font-semibold transition-colors ${
                      isActive
                        ? "bg-aa-neutral-100 text-aa-text-secondary cursor-default"
                        : "bg-aa-primary text-aa-text-on-primary hover:bg-aa-primary-hover"
                    }`}>
                    {isActive ? "Applied" : "Apply preset"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom prompts */}
        <div className={card}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={sectionHeadCls}>Custom prompts</h2>
              <p className="text-sm text-aa-text-secondary -mt-1">
                Override the system and user prompts sent to the model.
              </p>
            </div>
            <button onClick={handleResetPrompts} className={btnOutline}>
              Reset to defaults
            </button>
          </div>
          <hr className={divider} />
          <div className="space-y-6">
            {(
              [
                {
                  key: "resumeSystemPrompt" as keyof CustomPrompts,
                  label: "Resume system prompt",
                  hint: "Defines how the AI behaves when generating resumes."
                },
                {
                  key: "resumeUserPromptTemplate" as keyof CustomPrompts,
                  label: "Resume user prompt template",
                  hint: "Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders."
                },
                {
                  key: "coverLetterSystemPrompt" as keyof CustomPrompts,
                  label: "Cover letter system prompt",
                  hint: "Defines how the AI behaves when generating cover letters."
                },
                {
                  key: "coverLetterUserPromptTemplate" as keyof CustomPrompts,
                  label: "Cover letter user prompt template",
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
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-sm hover:opacity-90 transition-opacity">
                    Expand
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interview prep */}
        <div className={card}>
          <h2 className={sectionHeadCls}>Interview prep</h2>
          <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
            The plan generated for HR and technical interview stages.
          </p>
          <hr className={divider} />
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={perplexityConfig.preparationPlanEnabled}
                onChange={(e) =>
                  setPerplexityConfig({
                    ...perplexityConfig,
                    preparationPlanEnabled: e.target.checked
                  })
                }
                className="w-4 h-4 accent-aa-primary"
              />
              <span className="text-sm font-medium text-aa-text-primary">
                Generate an interview preparation plan
              </span>
            </label>
            <div>
              <label className={labelCls}>Preparation plan prompt</label>
              <textarea
                value={perplexityConfig.preparationPlanPrompt}
                onChange={(e) =>
                  setPerplexityConfig({
                    ...perplexityConfig,
                    preparationPlanPrompt: e.target.value
                  })
                }
                rows={6}
                className={textareaCls}
              />
              <div className="flex items-center justify-between mt-1">
                <p className={hintCls}>
                  Use {"{{companyName}}"}, {"{{jobTitle}}"},{" "}
                  {"{{jobDescription}}"}, and {"{{interviewType}}"} as
                  placeholders.
                </p>
                <button
                  onClick={() =>
                    openPerplexityDialog(
                      "Preparation Plan Prompt",
                      "preparation"
                    )
                  }
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-sm hover:opacity-90 transition-opacity">
                  Expand
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    "output-style": (() => {
      const tuning = llmTuning ?? DEFAULT_LLM_TUNING
      const strictnessIdx = STRICTNESS.indexOf(tuning.matchStrictness)
      const focusIdx = FOCUS.indexOf(tuning.resumeFocus)
      const toneLabel =
        tuning.writingTone[0].toUpperCase() + tuning.writingTone.slice(1)
      const focusLabel =
        tuning.resumeFocus === "skills"
          ? "Skills-first"
          : tuning.resumeFocus === "experience"
            ? "Experience-first"
            : "Balanced"
      return (
        <div className="space-y-8 max-w-4xl">
          {/* Scoring */}
          <section className="space-y-4">
            <div>
              <h2 className={sectionHeadCls}>Scoring</h2>
              <p className="text-sm text-aa-text-secondary -mt-2">
                How rigorously your profile is matched against the job's
                requirements.
              </p>
            </div>
            <div className="space-y-3 pt-1">
              <span className="block text-[12px] font-semibold text-aa-text-secondary">
                Match strictness
              </span>
              <Spectrum
                stops={["Rigorous", "Balanced", "Lenient"]}
                value={strictnessIdx < 0 ? 1 : strictnessIdx}
                onChange={(i) =>
                  setLlmTuning({
                    ...tuning,
                    matchStrictness: STRICTNESS[i] ?? tuning.matchStrictness
                  })
                }
              />
              <div className="flex items-start gap-3 rounded-aa-md bg-aa-primary-soft p-4 max-w-[660px]">
                <SlidersHorizontal className="w-4 h-4 text-aa-primary shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-aa-neutral-700">
                  {STRICTNESS_NOTE[tuning.matchStrictness]}
                </p>
              </div>
            </div>
          </section>

          <hr className={divider} />

          {/* Writing style */}
          <section className="space-y-4">
            <div>
              <h2 className={sectionHeadCls}>Writing style</h2>
              <p className="text-sm text-aa-text-secondary -mt-2">
                Tone and emphasis applied to the CV and the cover letter.
              </p>
            </div>

            <div className="flex flex-row gap-10 pt-1">
              <div className="space-y-8">
                <div className="space-y-3">
                  <span className="block text-[12px] font-semibold text-aa-text-secondary">
                    Tone
                  </span>
                  <div className="inline-flex rounded-aa-md border border-aa-border p-[3px]">
                    {TONE.map((opt) => {
                      const on = tuning.writingTone === opt
                      return (
                        <button
                          key={opt}
                          onClick={() =>
                            setLlmTuning({ ...tuning, writingTone: opt })
                          }
                          className={`px-4 py-2 rounded-aa-sm text-[12px] font-semibold transition-colors ${
                            on
                              ? "bg-aa-primary text-aa-text-on-primary"
                              : "text-aa-text-secondary hover:text-aa-text-primary"
                          }`}>
                          {opt[0].toUpperCase() + opt.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="block text-[12px] font-semibold text-aa-text-secondary">
                    Resume focus
                  </span>
                  <Spectrum
                    stops={["Skills-first", "Balanced", "Experience-first"]}
                    value={focusIdx < 0 ? 1 : focusIdx}
                    onChange={(i) =>
                      setLlmTuning({
                        ...tuning,
                        resumeFocus: FOCUS[i] ?? tuning.resumeFocus
                      })
                    }
                  />
                </div>
              </div>

              <div className="w-sm rounded-aa-lg border border-aa-border bg-aa-surface p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-aa-text-secondary">
                    Sample bullet
                  </span>
                  <span className="text-[10px] font-semibold rounded-aa-pill border border-aa-border px-2 py-[3px] text-aa-text-secondary">
                    {toneLabel} · {focusLabel}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-aa-neutral-700">
                  {SAMPLE_BULLETS[tuning.writingTone][tuning.resumeFocus]}
                </p>
                <p className="text-[11px] text-aa-text-secondary">
                  Updates as you change tone and focus.
                </p>
              </div>
            </div>
          </section>

          <button
            onClick={() => setLlmTuning(DEFAULT_LLM_TUNING)}
            className="text-[12px] font-semibold text-aa-primary bg-transparent border-0 p-0 cursor-pointer">
            Reset to defaults
          </button>
        </div>
      )
    })(),

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
          <p className="text-sm text-aa-text-secondary mb-4">
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
          <p className="text-sm text-aa-text-secondary mb-6">
            Sync your profile, settings, and saved applications across
            computers. Data is stored privately in your Google Drive app folder
            — only Bespoke can access it.
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
                  <li>
                    On a new device, connect and use Force Pull to restore
                  </li>
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
                  className="px-6 py-3 bg-aa-secondary text-aa-text-on-primary border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 hover:opacity-90 transition-colors">
                  {syncStatus.type === "loading"
                    ? "Connecting..."
                    : "Connect Google Drive"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-aa-success-soft border border-aa-success-strong p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-aa-success" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-aa-success-strong">
                    Connected
                  </span>
                </div>
                {syncConfig.lastSynced && (
                  <p className="text-xs text-aa-success-strong">
                    Last synced:{" "}
                    {new Date(syncConfig.lastSynced).toLocaleString()}
                  </p>
                )}
                {!syncConfig.lastSynced && (
                  <p className="text-xs text-aa-success-strong">
                    Sync will happen automatically when you make changes.
                  </p>
                )}
                {syncConfig.error && (
                  <p className="text-xs text-aa-error-strong mt-1">
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
          <p className="text-sm text-aa-text-secondary mb-6">
            Download a full backup or restore from a previously exported file.
            Includes profile, settings, and all saved applications with
            generated CVs and cover letters.
          </p>
          <hr className={divider} />
          <div className="flex gap-3">
            <button
              onClick={handleExportData}
              className="px-5 py-2.5 bg-aa-success-strong text-aa-text-on-primary border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-colors">
              Export Data
            </button>
            <button
              onClick={handleImportData}
              className="px-5 py-2.5 bg-aa-secondary text-aa-text-on-primary border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-colors">
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
      <div className="flex flex-col min-h-screen bg-aa-neutral-50 font-aa text-aa-text-primary">
        <AppBar
          section={section}
          onSection={changeSection}
          email={userProfile.personalInfo?.email || undefined}
        />

        {section === "settings" ? (
          <div className="flex flex-1">
            <SettingsRail
              groups={NAV_GROUPS}
              active={activeTab}
              onSelect={setActiveTab}
            />

            <div className="flex-1 flex flex-col min-w-0">
              {/* Section sub-topbar */}
              <div className="h-14 shrink-0 bg-aa-surface border-b border-aa-border px-8 flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h1 className="text-[18px] font-semibold text-aa-text-primary shrink-0">
                    {activeNav?.label ?? ""}
                  </h1>
                  <p className="text-[13px] text-aa-text-secondary truncate">
                    {activeNav?.subtitle ?? ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {saveStatus ? (
                    <span className="text-[12px] font-semibold text-aa-success-strong">
                      {saveStatus}
                    </span>
                  ) : (
                    <span className="text-[12px] text-aa-neutral-500">
                      All changes saved
                    </span>
                  )}
                  <button onClick={handleSaveSettings} className={btnAccent}>
                    Save changes
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-8 py-8">
                {tabContent[activeTab]}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-10 py-8">
            <ApplicationsPlaceholder />
          </div>
        )}
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

/**
 * Phase 1 placeholder — the real applications list + Overview land here in
 * Phase 4. Until then this points at the side panel.
 */
function ApplicationsPlaceholder() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    chrome.storage.local.get("savedApplications", (res) => {
      setCount(
        Array.isArray(res.savedApplications) ? res.savedApplications.length : 0
      )
    })
  }, [])

  return (
    <div className="max-w-xl">
      <h1 className="text-[22px] font-bold tracking-[-0.4px] text-aa-text-primary">
        Applications
      </h1>
      <p className="mt-1 text-[14px] text-aa-text-secondary">
        {count === null
          ? "Loading…"
          : count === 0
            ? "No tracked applications yet."
            : `${count} tracked application${count === 1 ? "" : "s"}.`}
      </p>
      <div className="mt-6 bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6 text-[13px] text-aa-neutral-700 leading-relaxed">
        The full applications list and Overview move into this tab in an upcoming
        release. For now, open the side panel from the toolbar popup, or
        right-click a job posting →{" "}
        <span className="font-semibold text-aa-text-primary">
          Check my match
        </span>
        .
      </div>
    </div>
  )
}

export default Options

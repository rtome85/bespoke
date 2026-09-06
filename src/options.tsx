import {
  Boxes,
  Briefcase,
  ChevronDown,
  CloudCog,
  FileText,
  Folder,
  GraduationCap,
  Languages as LanguagesIcon,
  RefreshCw,
  Route,
  SlidersHorizontal,
  User,
  Zap
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { AppBar, type AppSection } from "~components/AppBar"
import { ApplicationsList } from "~components/ApplicationsList"
import { ApplicationsOverview } from "~components/ApplicationsOverview"
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
  DEFAULT_MODEL_ROUTING,
  DEFAULT_PERPLEXITY_PROMPT,
  DEFAULT_PREPARATION_PLAN_PROMPT,
  DEFAULT_PROMPTS,
  MODEL_COST_PER_MTOK,
  PROMPT_TEMPLATES,
  PROMPTS_VERSION,
  PROVIDER_META,
  RUN_TOKENS,
  type CustomPrompts,
  type LLMProviderId,
  type LLMTuningConfig,
  type ModelRouting,
  type PerplexityConfig,
  type PromptTemplate,
  type ProviderConfig,
  type ProvidersConfig,
  type RoutableJob,
  type RouteTarget
} from "~types/config"
import {
  DEFAULT_USER_PROFILE,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"
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
        label: "Providers",
        value: "providers",
        subtitle: "Model accounts and API keys",
        icon: Boxes
      },
      {
        label: "Model routing",
        value: "model-routing",
        subtitle: "Which model runs each job",
        icon: Route
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

// ── Model routing helpers ────────────────────────────────────────────────────
const PROVIDER_IDS: LLMProviderId[] = ["ollama", "openai", "anthropic", "google"]

const encodeRoute = (t: RouteTarget) => `${t.provider}::${t.model}`

const decodeRoute = (v: string): RouteTarget => {
  const i = v.indexOf("::")
  return {
    provider: v.slice(0, i) as LLMProviderId,
    model: v.slice(i + 2)
  }
}

/** Rough $/run for the cost hint; null when the model has no price (local). */
const runCost = (model: string, job: RoutableJob): number | null => {
  const per = MODEL_COST_PER_MTOK[model]
  if (per == null) return null
  return (per * RUN_TOKENS[job]) / 1_000_000
}

const fmtCost = (n: number) =>
  n < 0.01 ? `<$0.01` : `$${n.toFixed(n < 1 ? 3 : 2)}`

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

const URL_PARAMS =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()

function Options() {
  const [section, setSection] = useState<AppSection>(
    URL_PARAMS.get("section") === "applications" ? "applications" : "settings"
  )
  const [activeTab, setActiveTab] = useState("providers")
  const appsStartOnOverview = URL_PARAMS.get("view") === "overview"

  useEffect(() => {
    // A ?section= deep link (from the popup / retired analytics tab) wins
    // over the last-used section.
    if (URL_PARAMS.get("section")) return
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

  const [providers, setProviders] = useDebouncedStorage<ProvidersConfig>(
    "providers",
    {}
  )
  const [modelRouting, setModelRouting] = useDebouncedStorage<ModelRouting>(
    "modelRouting",
    DEFAULT_MODEL_ROUTING
  )

  // One-time migration: seed providers + routing from the legacy Ollama
  // config so the new pages reflect the current setup.
  useEffect(() => {
    chrome.storage.local.get(
      ["providers", "modelRouting", "ollamaConfig", "lastSelectedModel"],
      (res) => {
        if (res.providers) return
        const model = res.lastSelectedModel || DEFAULT_MODEL_ROUTING.scoring.model
        const seededProviders: ProvidersConfig = {
          ollama: {
            apiKey: res.ollamaConfig?.apiKey ?? "",
            baseUrl: res.ollamaConfig?.baseUrl ?? PROVIDER_META.ollama.defaultBaseUrl,
            enabled: true
          }
        }
        const seededRouting: ModelRouting = res.modelRouting ?? {
          scoring: { provider: "ollama", model },
          drafting: { provider: "ollama", model },
          fallback: { enabled: false, target: { provider: "ollama", model } }
        }
        chrome.storage.local.set({
          providers: seededProviders,
          modelRouting: seededRouting
        })
        setProviders(seededProviders)
        setModelRouting(seededRouting)
      }
    )
  }, [])

  const providerModels = (id: LLMProviderId): string[] => {
    const stored = providers[id]?.models
    if (stored?.length) return stored
    if (id === "ollama") return AVAILABLE_MODELS.map((m) => m.id)
    return PROVIDER_META[id].fallbackModels
  }

  const connectedProviders = (): LLMProviderId[] =>
    (["ollama", "openai", "anthropic", "google"] as LLMProviderId[]).filter(
      (id) => {
        const c = providers[id]
        if (!c || c.enabled === false) return false
        return PROVIDER_META[id].local || !!c.apiKey
      }
    )

  const updateProvider = (id: LLMProviderId, patch: Partial<ProviderConfig>) =>
    setProviders({
      ...providers,
      [id]: {
        apiKey: "",
        enabled: true,
        ...providers[id],
        ...patch
      }
    })

  const [providerTest, setProviderTest] = useState<
    Partial<Record<LLMProviderId, { type: "idle" | "loading" | "ok" | "err"; message: string }>>
  >({})

  const [openProvider, setOpenProvider] = useState<string | null>("ollama")

  const setRoute = (job: RoutableJob | "fallback", v: string) => {
    const target = decodeRoute(v)
    setModelRouting(
      job === "fallback"
        ? { ...modelRouting, fallback: { ...modelRouting.fallback, target } }
        : { ...modelRouting, [job]: target }
    )
  }

  const testProvider = async (id: LLMProviderId) => {
    setProviderTest((s) => ({ ...s, [id]: { type: "loading", message: "" } }))
    try {
      const r = await sendToBackground({
        name: "testOllamaConnection",
        body: {
          provider: id,
          apiKey: providers[id]?.apiKey ?? "",
          baseUrl: providers[id]?.baseUrl
        }
      })
      setProviderTest((s) => ({
        ...s,
        [id]: {
          type: r?.success ? "ok" : "err",
          message: r?.message ?? (r?.success ? "Connected." : "Failed.")
        }
      }))
    } catch {
      setProviderTest((s) => ({
        ...s,
        [id]: { type: "err", message: "Connection failed." }
      }))
    }
  }

  const refreshProviderModels = async (id: LLMProviderId) => {
    setProviderTest((s) => ({ ...s, [id]: { type: "loading", message: "" } }))
    try {
      const r = await sendToBackground({
        name: "listProviderModels",
        body: {
          provider: id,
          apiKey: providers[id]?.apiKey ?? "",
          baseUrl: providers[id]?.baseUrl
        }
      })
      if (Array.isArray(r?.models)) updateProvider(id, { models: r.models })
      setProviderTest((s) => ({
        ...s,
        [id]: {
          type: r?.success ? "ok" : "err",
          message: r?.success
            ? `${r.models.length} models`
            : (r?.message ?? "Failed to list models")
        }
      }))
    } catch {
      setProviderTest((s) => ({
        ...s,
        [id]: { type: "err", message: "Failed to list models." }
      }))
    }
  }

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
      lastSelectedModel: matchModel,
      providers,
      modelRouting
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
        perplexityConfig,
        providers,
        modelRouting,
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
          if (data.perplexityConfig) setPerplexityConfig(data.perplexityConfig)
          if (data.providers) setProviders(data.providers)
          if (data.modelRouting) setModelRouting(data.modelRouting)
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
    providers: (() => {
      const connected = connectedProviders()
      return (
        <div className="space-y-6">
          {PROVIDER_IDS.map((id) => {
            const meta = PROVIDER_META[id]
            const cfg = providers[id]
            const isOpen = openProvider === id
            const isConnected = connected.includes(id)
            const test = providerTest[id]
            const models = providerModels(id)
            return (
              <div
                key={id}
                className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenProvider(isOpen ? null : id)}
                  className="w-full flex items-center gap-4 p-aa-5 text-left hover:bg-aa-neutral-50 transition-colors">
                  <span className="grid place-items-center w-9 h-9 rounded-aa-md bg-aa-primary-soft text-aa-primary font-bold text-sm shrink-0">
                    {meta.name[0]}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-aa-text-primary text-sm">
                        {meta.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-1.5 py-0.5 border ${
                          meta.local
                            ? "bg-aa-success-soft text-aa-success-strong border-aa-success-strong"
                            : "bg-aa-neutral-100 text-aa-text-secondary border-aa-border"
                        }`}>
                        {meta.local ? "Free" : "Paid"}
                      </span>
                    </span>
                    <span className="block text-[12px] text-aa-text-secondary mt-0.5">
                      {meta.local
                        ? "Local or Ollama Cloud — no per-token cost"
                        : `Usage-based API · ${models.length} models`}
                    </span>
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-[11px] font-semibold shrink-0 ${
                      isConnected
                        ? "text-aa-success-strong"
                        : "text-aa-text-secondary"
                    }`}>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isConnected ? "bg-aa-success" : "bg-aa-neutral-400"
                      }`}
                    />
                    {isConnected ? "Connected" : "Not connected"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-aa-text-secondary shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-aa-border p-aa-5 space-y-5">
                    {meta.local && (
                      <div>
                        <span className={labelCls}>Endpoint</span>
                        <div className="inline-flex rounded-aa-md border border-aa-border p-[3px]">
                          {[
                            {
                              label: "Ollama Cloud",
                              url: meta.defaultBaseUrl as string
                            },
                            {
                              label: "Local",
                              url: "http://localhost:11434/api"
                            }
                          ].map((opt) => {
                            const on =
                              (cfg?.baseUrl ?? meta.defaultBaseUrl) === opt.url
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() =>
                                  updateProvider(id, { baseUrl: opt.url })
                                }
                                className={`px-3 py-1.5 rounded-aa-sm text-[12px] font-semibold transition-colors ${
                                  on
                                    ? "bg-aa-primary text-aa-text-on-primary"
                                    : "text-aa-text-secondary hover:text-aa-text-primary"
                                }`}>
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={labelCls}>
                        API key{meta.local ? " (cloud only)" : " *"}
                      </label>
                      <input
                        type="password"
                        value={cfg?.apiKey ?? ""}
                        onChange={(e) =>
                          updateProvider(id, { apiKey: e.target.value })
                        }
                        placeholder={
                          id === "ollama"
                            ? "oll-…"
                            : id === "openai"
                              ? "sk-…"
                              : id === "anthropic"
                                ? "sk-ant-…"
                                : "AIza…"
                        }
                        className={inputCls}
                      />
                      {meta.keyUrl && (
                        <p className={hintCls}>
                          Get a key from{" "}
                          <a
                            href={meta.keyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-aa-primary hover:underline">
                            {meta.keyUrl.replace(/^https?:\/\//, "")}
                          </a>
                        </p>
                      )}
                    </div>

                    {!meta.local && (
                      <div>
                        <label className={labelCls}>Base URL</label>
                        <input
                          type="text"
                          value={cfg?.baseUrl ?? ""}
                          onChange={(e) =>
                            updateProvider(id, { baseUrl: e.target.value })
                          }
                          placeholder={meta.defaultBaseUrl}
                          className={inputCls}
                        />
                        <p className={hintCls}>
                          Leave blank unless you use a proxy or gateway.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => testProvider(id)}
                        disabled={test?.type === "loading"}
                        className={btnOutline}>
                        {test?.type === "loading"
                          ? "Testing…"
                          : "Test connection"}
                      </button>
                      <button
                        type="button"
                        onClick={() => refreshProviderModels(id)}
                        disabled={test?.type === "loading"}
                        className={btnSecondary}>
                        <RefreshCw className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
                        Refresh models
                      </button>
                      {test && test.type !== "loading" && test.message && (
                        <span
                          className={`text-[12px] font-semibold ${
                            test.type === "ok"
                              ? "text-aa-success-strong"
                              : "text-aa-error-strong"
                          }`}>
                          {test.message}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className={labelCls}>Available models</span>
                      <div className="flex flex-wrap gap-1.5">
                        {models.map((m) => (
                          <span
                            key={m}
                            className="text-[11px] font-mono rounded-aa-sm border border-aa-border bg-aa-neutral-50 px-2 py-1 text-aa-text-secondary">
                            {m}
                          </span>
                        ))}
                      </div>
                      {!cfg?.models?.length && (
                        <p className={hintCls}>
                          Built-in list. Test the connection, then refresh to
                          pull the live catalogue.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Perplexity — research / interview only */}
          <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpenProvider(
                  openProvider === "perplexity" ? null : "perplexity"
                )
              }
              className="w-full flex items-center gap-4 p-aa-5 text-left hover:bg-aa-neutral-50 transition-colors">
              <span className="grid place-items-center w-9 h-9 rounded-aa-md bg-aa-primary-soft text-aa-primary font-bold text-sm shrink-0">
                P
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-aa-text-primary text-sm">
                    Perplexity Sonar
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-1.5 py-0.5 border bg-aa-neutral-100 text-aa-text-secondary border-aa-border">
                    Paid
                  </span>
                </span>
                <span className="block text-[12px] text-aa-text-secondary mt-0.5">
                  Company research and interview prep only — never scoring or
                  drafting
                </span>
              </span>
              <span
                className={`flex items-center gap-1.5 text-[11px] font-semibold shrink-0 ${
                  perplexityConfig.enabled && perplexityConfig.apiKey
                    ? "text-aa-success-strong"
                    : "text-aa-text-secondary"
                }`}>
                <span
                  className={`w-2 h-2 rounded-full ${
                    perplexityConfig.enabled && perplexityConfig.apiKey
                      ? "bg-aa-success"
                      : "bg-aa-neutral-400"
                  }`}
                />
                {perplexityConfig.enabled && perplexityConfig.apiKey
                  ? "Connected"
                  : "Not connected"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-aa-text-secondary shrink-0 transition-transform ${
                  openProvider === "perplexity" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openProvider === "perplexity" && (
              <div className="border-t border-aa-border p-aa-5 space-y-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={perplexityConfig.enabled}
                    onChange={(e) =>
                      setPerplexityConfig({
                        ...perplexityConfig,
                        enabled: e.target.checked
                      })
                    }
                    className="w-4 h-4 accent-aa-primary"
                  />
                  <span className="text-sm font-medium text-aa-text-primary">
                    Enable company research
                  </span>
                </label>

                <div>
                  <label className={labelCls}>API key *</label>
                  <input
                    type="password"
                    value={perplexityConfig.apiKey}
                    onChange={(e) =>
                      setPerplexityConfig({
                        ...perplexityConfig,
                        apiKey: e.target.value
                      })
                    }
                    placeholder="pplx-…"
                    className={inputCls}
                  />
                  <p className={hintCls}>
                    Get a key from{" "}
                    <a
                      href="https://www.perplexity.ai/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-aa-primary hover:underline">
                      perplexity.ai/settings/api
                    </a>
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestPerplexity}
                    disabled={perplexityTestStatus.type === "loading"}
                    className={btnOutline}>
                    {perplexityTestStatus.type === "loading"
                      ? "Testing…"
                      : "Test connection"}
                  </button>
                  {perplexityTestStatus.type === "success" && (
                    <span className="text-[12px] font-semibold text-aa-success-strong">
                      {perplexityTestStatus.message}
                    </span>
                  )}
                  {perplexityTestStatus.type === "error" && (
                    <span className="text-[12px] font-semibold text-aa-error-strong">
                      {perplexityTestStatus.message}
                    </span>
                  )}
                </div>

                <p className={hintCls}>
                  The research and interview-prep prompts live on the{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("prompts")}
                    className="text-aa-primary hover:underline bg-transparent border-0 p-0 cursor-pointer font-semibold">
                    Prompts
                  </button>{" "}
                  page.
                </p>
              </div>
            )}
          </div>

          <p className="text-[12px] text-aa-text-secondary flex items-start gap-2">
            <span className="text-aa-primary mt-px">•</span>
            Keys are stored locally in this browser and sent only to the provider
            you enable — never to Bespoke.
          </p>
        </div>
      )
    })(),

    "model-routing": (() => {
      const connected = connectedProviders()
      const tuning = llmTuning ?? DEFAULT_LLM_TUNING
      const noProviders = connected.length === 0

      const routeSelect = (
        job: RoutableJob | "fallback",
        target: RouteTarget,
        disabled: boolean
      ) => (
        <select
          value={encodeRoute(target)}
          disabled={disabled}
          onChange={(e) => setRoute(job, e.target.value)}
          className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
          {!connected.includes(target.provider) && (
            <option value={encodeRoute(target)}>
              {PROVIDER_META[target.provider].name} · {target.model} (not
              connected)
            </option>
          )}
          {connected.map((pid) => (
            <optgroup key={pid} label={PROVIDER_META[pid].name}>
              {providerModels(pid).map((m) => (
                <option key={`${pid}::${m}`} value={`${pid}::${m}`}>
                  {PROVIDER_META[pid].name} · {m}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )

      const jobRow = (label: string, sub: string, job: RoutableJob) => {
        const target = modelRouting[job]
        const cost = runCost(target.model, job)
        return (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,minmax(0,320px)] gap-3 sm:items-start py-4 border-b border-aa-border last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-aa-text-primary">
                {label}
              </p>
              <p className="text-[12px] text-aa-text-secondary mt-0.5">{sub}</p>
            </div>
            <div className="space-y-1.5">
              {routeSelect(job, target, noProviders)}
              <p className="text-[11px] text-aa-text-secondary">
                {noProviders
                  ? "Connect a provider to route this job."
                  : cost == null
                    ? "No per-token cost on this model."
                    : `≈ ${fmtCost(cost)} per run`}
              </p>
            </div>
          </div>
        )
      }

      const lockedRow = (label: string, sub: string) => (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,minmax(0,320px)] gap-3 sm:items-start py-4 border-b border-aa-border last:border-0 last:pb-0">
          <div>
            <p className="text-sm font-semibold text-aa-text-primary">{label}</p>
            <p className="text-[12px] text-aa-text-secondary mt-0.5">{sub}</p>
          </div>
          <div className="space-y-1.5">
            <div
              className={`${inputCls} flex items-center gap-2 text-aa-text-secondary bg-aa-neutral-50`}>
              <Route className="w-3.5 h-3.5 shrink-0" />
              Perplexity Sonar
            </div>
            <p className="text-[11px] text-aa-text-secondary">
              Fixed — configure it on the Providers page.
            </p>
          </div>
        </div>
      )

      return (
        <div className="space-y-6 max-w-3xl">
          {noProviders && (
            <div className={infoMsg}>
              No AI provider is connected yet. Add one on the{" "}
              <button
                type="button"
                onClick={() => setActiveTab("providers")}
                className="font-semibold underline bg-transparent border-0 p-0 cursor-pointer text-aa-neutral-700">
                Providers
              </button>{" "}
              page to route scoring and drafting.
            </div>
          )}

          {/* Assignments */}
          <div className={card}>
            <h2 className={sectionHeadCls}>Assignments</h2>
            <p className="text-sm text-aa-text-secondary -mt-1">
              Which model runs each job.
            </p>
            <hr className={divider} />
            <div>
              {jobRow(
                "Match scoring",
                "Scores your profile against the job and writes the gap analysis.",
                "scoring"
              )}
              {jobRow(
                "Document drafting",
                "Writes the tailored CV and the cover letter.",
                "drafting"
              )}
              {lockedRow(
                "Company research",
                "Pulls the company facts shown in the report."
              )}
              {lockedRow(
                "Interview prep",
                "Generates the HR and technical interview plan."
              )}
            </div>
          </div>

          {/* Fallback */}
          <div className={card}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={sectionHeadCls}>Fallback</h2>
                <p className="text-sm text-aa-text-secondary -mt-1">
                  Retry on a second model when the primary one errors or times
                  out.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={modelRouting.fallback.enabled}
                  onChange={(e) =>
                    setModelRouting({
                      ...modelRouting,
                      fallback: {
                        ...modelRouting.fallback,
                        enabled: e.target.checked
                      }
                    })
                  }
                  className="w-4 h-4 accent-aa-primary"
                />
                <span className="text-[12px] font-semibold text-aa-text-secondary">
                  {modelRouting.fallback.enabled ? "On" : "Off"}
                </span>
              </label>
            </div>
            {modelRouting.fallback.enabled && (
              <>
                <hr className={divider} />
                <label className={labelCls}>Fallback model</label>
                {routeSelect(
                  "fallback",
                  modelRouting.fallback.target,
                  noProviders
                )}
              </>
            )}
          </div>

          {/* Generation parameters */}
          <div className={card}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={sectionHeadCls}>Generation parameters</h2>
                <p className="text-sm text-aa-text-secondary -mt-1">
                  Applied to every routed model. Defaults suit most cases.
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
              ].map(({ label, key, min, max, step, fmt, lo, hi }) => (
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
              ))}
            </div>
          </div>
        </div>
      )
    })(),

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

        {/* Company research */}
        <div className={card}>
          <h2 className={sectionHeadCls}>Company research</h2>
          <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
            Runs on Perplexity Sonar to fill the "About the company" section of
            the report. Connect Perplexity on the Providers page.
          </p>
          <hr className={divider} />
          <div>
            <label className={labelCls}>Research prompt</label>
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
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-sm hover:opacity-90 transition-opacity">
                Expand
              </button>
            </div>
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
            <ApplicationsSection initialOverview={appsStartOnOverview} />
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

/** Opens the side panel's dialog page in a standalone window. */
function openDialogWindow(view: "saveForm" | "applicationsList") {
  chrome.windows.create({
    url: chrome.runtime.getURL(`tabs/dialog.html?view=${view}`),
    type: "popup",
    width: 720,
    height: 560,
    focused: true
  })
}

/**
 * Applications area of the app shell — the tracked-application list and the
 * Overview (analytics), replacing the side-panel list and the standalone
 * analytics tab.
 */
function ApplicationsSection({
  initialOverview
}: {
  initialOverview?: boolean
}) {
  const [apps, setApps] = useState<SavedApplication[]>([])
  const [view, setView] = useState<"all" | "overview">(
    initialOverview ? "overview" : "all"
  )

  useEffect(() => {
    chrome.storage.local.get("savedApplications", (res) => {
      if (Array.isArray(res.savedApplications)) setApps(res.savedApplications)
    })
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes.savedApplications) {
        setApps(changes.savedApplications.newValue ?? [])
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const persist = (next: SavedApplication[]) => {
    setApps(next)
    chrome.storage.local.set({ savedApplications: next })
  }

  const updateApplication = (id: string, patch: Partial<SavedApplication>) => {
    const now = new Date().toISOString()
    persist(
      apps.map((a) => {
        if (a.id !== id) return a
        const bumped =
          "status" in patch && patch.status !== a.status
            ? { statusUpdatedAt: now }
            : {}
        return { ...a, ...patch, ...bumped }
      })
    )
  }

  const deleteApplication = (id: string) =>
    persist(apps.filter((a) => a.id !== id))

  return (
    <div>
      <div className="inline-flex rounded-aa-md border border-aa-border p-[3px] mb-5">
        {(
          [
            { id: "all", label: "All" },
            { id: "overview", label: "Overview" }
          ] as const
        ).map((t) => {
          const on = view === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`px-4 py-1.5 rounded-aa-sm text-[12px] font-semibold transition-colors ${
                on
                  ? "bg-aa-primary text-aa-text-on-primary"
                  : "text-aa-text-secondary hover:text-aa-text-primary"
              }`}>
              {t.label}
            </button>
          )
        })}
      </div>

      {view === "all" ? (
        <ApplicationsList
          applications={apps}
          onUpdate={updateApplication}
          onDelete={deleteApplication}
          onTrackNew={() => openDialogWindow("saveForm")}
          onOpenSidePanel={() => openDialogWindow("applicationsList")}
        />
      ) : (
        <ApplicationsOverview
          applications={apps}
          onOpen={() => openDialogWindow("applicationsList")}
        />
      )}
    </div>
  )
}

export default Options

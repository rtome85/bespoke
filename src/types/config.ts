import type { UserProfile } from "./userProfile"

export interface OllamaConfig {
  apiKey: string
  baseUrl: string
  enabled: boolean
}

export interface PerplexityConfig {
  apiKey: string
  enabled: boolean
  customPrompt: string
  /**
   * Prompt for the per-round Prep engine (Interviews → Prep). Runs on the
   * `drafting` LLM route and must return JSON `{ likelyTopics, talkingPoints }`.
   * Optional in storage — consumers fall back to `DEFAULT_INTERVIEW_PREP_PROMPT`.
   */
  interviewPrepPrompt?: string
  /**
   * Prompt used instead of `interviewPrepPrompt` when the round is a Technical
   * one (see `isTechnicalRound`). A technical round is prepped as a study plan
   * — stack review, exercises, a Q&A drill — so it returns a different set of
   * sections. Optional in storage; consumers fall back to
   * `DEFAULT_TECHNICAL_PREP_PROMPT`.
   */
  technicalPrepPrompt?: string
  /**
   * Verdict of the last connection test, mirroring `ProviderConfig`. Voided
   * whenever `apiKey` changes — a verdict belongs to the key that earned it.
   */
  lastTested?: { ok: boolean; at: string; message: string }
}

/** Web-search back ends that can feed company research. */
export type SearchEngineId = "tavily" | "brave" | "exa"

export interface SearchEngineMeta {
  id: SearchEngineId
  name: string
  keyPlaceholder: string
  keyUrl: string
  /** Free-tier line shown on the settings card. */
  access: string
}

export const SEARCH_ENGINE_META: Record<SearchEngineId, SearchEngineMeta> = {
  tavily: {
    id: "tavily",
    name: "Tavily",
    keyPlaceholder: "tvly-…",
    keyUrl: "https://app.tavily.com/home",
    access: "Free tier, then usage-based"
  },
  brave: {
    id: "brave",
    name: "Brave Search",
    keyPlaceholder: "Brave subscription token",
    keyUrl: "https://api-dashboard.search.brave.com/app/keys",
    access: "Free tier, then usage-based"
  },
  exa: {
    id: "exa",
    name: "Exa",
    keyPlaceholder: "Exa API key",
    keyUrl: "https://dashboard.exa.ai/api-keys",
    access: "Free tier, then usage-based"
  }
}

export const SEARCH_ENGINE_IDS: SearchEngineId[] = ["tavily", "brave", "exa"]

/**
 * A web-search account for company research. One engine at a time — research
 * needs a handful of snippets, not a federated search, and a second key would
 * only add a setting nobody tunes.
 */
export interface SearchConfig {
  engine: SearchEngineId
  apiKey: string
  enabled: boolean
  /** Mirrors `ProviderConfig`; voided whenever `apiKey` or `engine` changes. */
  lastTested?: { ok: boolean; at: string; message: string }
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  engine: "tavily",
  apiKey: "",
  enabled: false
}

/** Where a company-research entry came from, for the provenance line. */
export type ResearchSource = "perplexity" | "search" | "site" | "model"

/**
 * Which source runs company research. `auto` tries every configured source in
 * descending order of how well-grounded it is; naming one pins research to it
 * and reports a clear error instead of quietly answering from a weaker source.
 */
export type ResearchPreference = ResearchSource | "auto"

export const RESEARCH_PREFERENCES: ResearchPreference[] = [
  "auto",
  "perplexity",
  "search",
  "site",
  "model"
]

export const RESEARCH_PREFERENCE_LABELS: Record<ResearchPreference, string> = {
  auto: "Automatic — best available source",
  perplexity: "Perplexity only",
  search: "Web search only",
  site: "The company's own site only",
  model: "Model knowledge only — not verified against the web"
}

export const RESEARCH_SOURCE_LABELS: Record<ResearchSource, string> = {
  perplexity: "Perplexity",
  search: "Web search",
  site: "The company's own site",
  model: "Model knowledge — not verified against the web"
}

/**
 * How long a cached company-research entry is treated as current. Company
 * facts drift slowly, but a stale entry behind an interview is worse than a
 * second call, so the Prep card offers a refresh past this age.
 */
export const RESEARCH_STALE_MS = 30 * 86_400_000

export interface ModelConfig {
  id: string
  name: string
  description: string
  size: string
  recommended: boolean
  /** Relative token cost per match-analysis call — some models spend a lot of hidden reasoning tokens before answering. */
  costProfile: "low" | "medium" | "high"
  /** Relative response latency. */
  speedProfile: "fast" | "medium" | "slow"
  /** How the model tends to score a profile-vs-job match: strict penalizes missing skills hard, generous gives more benefit of the doubt. */
  scoringProfile: "strict" | "balanced" | "generous"
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gpt-oss:20b-cloud",
    name: "GPT-OSS 20B",
    description:
      "Fast, cost-effective. Best for quick turnaround on CV workflows.",
    size: "20B",
    recommended: true,
    costProfile: "medium",
    speedProfile: "fast",
    scoringProfile: "balanced"
  },
  {
    id: "gpt-oss:120b-cloud",
    name: "GPT-OSS 120B",
    description:
      "Higher quality than 20B, same family. Good balance of speed and depth.",
    size: "120B",
    recommended: false,
    costProfile: "medium",
    speedProfile: "fast",
    scoringProfile: "balanced"
  },
  {
    id: "gemma4:31b-cloud",
    name: "Gemma 4 31B",
    description:
      "Google's latest frontier model. Strong instruction following and writing quality.",
    size: "31B",
    recommended: false,
    costProfile: "low",
    speedProfile: "medium",
    scoringProfile: "generous"
  },
  {
    id: "minimax-m3:cloud",
    name: "MiniMax M3",
    description:
      "MoE model. Scores more strictly than other models — weighs missing required skills heavily.",
    size: "MoE",
    recommended: false,
    costProfile: "medium",
    speedProfile: "slow",
    scoringProfile: "strict"
  },
  {
    id: "nemotron-3-nano:30b-cloud",
    name: "Nemotron 3 Nano",
    description:
      "MoE model, fast and reliable for structured generation and CV tailoring.",
    size: "MoE",
    recommended: false,
    costProfile: "high",
    speedProfile: "medium",
    scoringProfile: "generous"
  },
]

/**
 * Language the generated CV and cover letter are written in. `"auto"` (the
 * default) follows the job posting — a Portuguese posting gets a Portuguese
 * CV — anything else forces that language regardless of the posting.
 */
export type OutputLanguage =
  | "auto"
  | "en"
  | "pt"
  | "pt-BR"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "nl"

/**
 * `label` is the settings dropdown entry; `name` is how the language is named
 * to the model, so it must stay unambiguous ("European Portuguese", not "pt").
 */
export const OUTPUT_LANGUAGE_META: Record<
  OutputLanguage,
  { label: string; name: string }
> = {
  auto: { label: "Match the job posting", name: "" },
  en: { label: "English", name: "English" },
  pt: { label: "Portuguese (Portugal)", name: "European Portuguese" },
  "pt-BR": { label: "Portuguese (Brazil)", name: "Brazilian Portuguese" },
  es: { label: "Spanish", name: "Spanish" },
  fr: { label: "French", name: "French" },
  de: { label: "German", name: "German" },
  it: { label: "Italian", name: "Italian" },
  nl: { label: "Dutch", name: "Dutch" }
}

export const OUTPUT_LANGUAGES = Object.keys(
  OUTPUT_LANGUAGE_META
) as OutputLanguage[]

export interface LLMTuningConfig {
  /** Creativity / randomness (0.1 = deterministic, 1.5 = very creative). Default 0.7 */
  temperature: number
  /** Nucleus sampling — lower = more conservative vocabulary. Default 0.9 */
  topP: number
  /** Maximum tokens the model may generate per call. Default 4096 */
  maxTokens: number
  /** How rigorously the profile-vs-job match is scored */
  matchStrictness: "strict" | "balanced" | "generous"
  /** Tone injected into every generated document */
  writingTone: "formal" | "professional" | "conversational"
  /** Which profile section the resume should lead with */
  resumeFocus: "skills" | "experience" | "balanced"
  /** How much detail and evidence each bullet carries */
  bulletDensity: "concise" | "standard" | "detailed"
  /** Vocabulary and sentence complexity target */
  readingLevel: "simple" | "standard" | "advanced"
  /**
   * Language the CV and cover letter are written in. Optional in storage —
   * configs saved before this setting existed have no value, and every reader
   * falls back to `DEFAULT_LLM_TUNING.outputLanguage`.
   */
  outputLanguage?: OutputLanguage
}

export const DEFAULT_LLM_TUNING: LLMTuningConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  matchStrictness: "balanced",
  writingTone: "professional",
  resumeFocus: "balanced",
  bulletDensity: "standard",
  readingLevel: "standard",
  outputLanguage: "auto"
}

export interface CustomPrompts {
  resumeSystemPrompt: string
  resumeUserPromptTemplate: string
  coverLetterSystemPrompt: string
  coverLetterUserPromptTemplate: string
}

export interface PromptTemplate {
  id: string
  name: string
  tagLine: string
  bullets: string[]
  prompts: CustomPrompts
}

export interface GenerateRequest {
  jobDescription: string
  companyName: string
  jobTitle: string
  model: string
  prompts: CustomPrompts
  userProfile?: UserProfile
  llmTuning?: LLMTuningConfig
}

// ── Multi-provider ───────────────────────────────────────────────────────────

export type LLMProviderId =
  | "ollama"
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "deepseek"
  | "mistral"
  | "custom"

/** Per-provider account: credentials, endpoint override, cached model list. */
export interface ProviderConfig {
  apiKey: string
  /** Endpoint override. Ollama: local URL or the cloud API; others rarely set. */
  baseUrl?: string
  enabled: boolean
  /** Model ids last fetched from the provider. */
  models?: string[]
  lastTested?: { ok: boolean; at: string; message: string }
}

export type ProvidersConfig = Partial<Record<LLMProviderId, ProviderConfig>>

/**
 * Whether an account has what `PROVIDER_META[id].credential` asks for. The
 * single gate for "can this provider be routed to / tested", shared by the
 * settings UI and the background handlers.
 */
export function hasProviderCredential(
  id: LLMProviderId,
  config: Pick<ProviderConfig, "apiKey" | "baseUrl"> | undefined
): boolean {
  switch (PROVIDER_META[id].credential) {
    case "apiKey":
      return !!config?.apiKey
    case "baseUrl":
      return !!config?.baseUrl?.trim()
    default:
      return true
  }
}

/** The prompt shown when `hasProviderCredential` fails. */
export function missingCredentialMessage(id: LLMProviderId): string {
  return PROVIDER_META[id].credential === "baseUrl"
    ? "Please enter a base URL first"
    : "Please enter an API key first"
}

/** An AI job routed to a specific provider + model. */
export type RoutableJob = "scoring" | "drafting" | "prep"

export interface RouteTarget {
  provider: LLMProviderId
  model: string
}

export interface ModelRouting {
  scoring: RouteTarget
  drafting: RouteTarget
  /**
   * Interview prep and company-research synthesis. Optional in storage —
   * routing tables written before this job existed have no `prep` key, so
   * readers normalize through `normalizeModelRouting` and inherit
   * `drafting`, which is where prep used to run.
   */
  prep?: RouteTarget
  /**
   * Which source answers company research. Optional in storage — tables
   * written before it existed normalize to `auto`.
   */
  research?: ResearchPreference
  fallback: { enabled: boolean; target: RouteTarget }
}

export interface ProviderMeta {
  id: LLMProviderId
  name: string
  /** true = runs locally and free; false = usage-based paid API. */
  local: boolean
  /**
   * What an account needs before it can be routed to: an API key, a base URL
   * (a self-hosted or proxy endpoint, where the key is optional), or nothing.
   */
  credential: "apiKey" | "baseUrl" | "none"
  /** Where the user gets an API key. */
  keyUrl?: string
  /** Hint in the empty API key field, usually the key's vendor prefix. */
  keyPlaceholder: string
  /** Default endpoint. Empty for providers with a fixed URL. */
  defaultBaseUrl?: string
  /** Fallback model list when the provider has no list endpoint / it fails. */
  fallbackModels: string[]
}

export const PROVIDER_META: Record<LLMProviderId, ProviderMeta> = {
  ollama: {
    id: "ollama",
    name: "Ollama",
    local: true,
    credential: "none",
    keyPlaceholder: "oll-…",
    keyUrl: "https://ollama.com/settings/keys",
    defaultBaseUrl: "https://ollama.com/api",
    fallbackModels: AVAILABLE_MODELS.map((m) => m.id)
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    local: false,
    credential: "apiKey",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultBaseUrl: "https://api.openai.com/v1",
    fallbackModels: ["gpt-4o-mini", "gpt-4o", "o4-mini"]
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    local: false,
    credential: "apiKey",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    fallbackModels: [
      "claude-sonnet-4-20250514",
      "claude-3-5-haiku-20241022",
      "claude-opus-4-20250514"
    ]
  },
  google: {
    id: "google",
    name: "Google Gemini",
    local: false,
    credential: "apiKey",
    keyPlaceholder: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    fallbackModels: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-flash"]
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    local: false,
    credential: "apiKey",
    keyPlaceholder: "sk-or-…",
    keyUrl: "https://openrouter.ai/settings/keys",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    fallbackModels: [
      "openrouter/auto",
      "anthropic/claude-sonnet-5",
      "deepseek/deepseek-chat"
    ]
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    local: false,
    credential: "apiKey",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.deepseek.com/api_keys",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    fallbackModels: ["deepseek-chat", "deepseek-reasoner"]
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    local: false,
    credential: "apiKey",
    keyPlaceholder: "Mistral API key",
    keyUrl: "https://console.mistral.ai/api-keys",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    fallbackModels: [
      "mistral-medium-latest",
      "mistral-small-latest",
      "mistral-large-latest"
    ]
  },
  custom: {
    id: "custom",
    name: "Custom endpoint",
    local: false,
    credential: "baseUrl",
    keyPlaceholder: "Leave blank if the server needs no key",
    // No default: the user supplies an OpenAI-compatible URL (vLLM, LM
    // Studio, LiteLLM, Together, …) and its catalogue comes from a refresh.
    fallbackModels: []
  }
}

export const DEFAULT_MODEL_ROUTING: ModelRouting = {
  scoring: { provider: "ollama", model: "gpt-oss:20b-cloud" },
  drafting: { provider: "ollama", model: "gpt-oss:20b-cloud" },
  prep: { provider: "ollama", model: "gpt-oss:20b-cloud" },
  research: "auto",
  fallback: {
    enabled: false,
    target: { provider: "ollama", model: "gpt-oss:20b-cloud" }
  }
}

/**
 * Rough blended $/1M tokens (input+output) for a rule-of-thumb per-run
 * cost hint on the Model routing page. Not billing-accurate.
 */
export const MODEL_COST_PER_MTOK: Record<string, number> = {
  // OpenAI
  "gpt-4o-mini": 0.4,
  "gpt-4o": 6,
  "o4-mini": 2.2,
  // Anthropic
  "claude-3-5-haiku-20241022": 2.4,
  "claude-sonnet-4-20250514": 9,
  "claude-opus-4-20250514": 45,
  // Google
  "gemini-2.0-flash": 0.2,
  "gemini-1.5-flash": 0.2,
  "gemini-2.0-pro": 5
}

/** Approx. tokens a scoring, drafting or prep run spends, for the cost hint. */
export const RUN_TOKENS: Record<RoutableJob, number> = {
  scoring: 4000,
  drafting: 9000,
  prep: 7000
}

/**
 * Fill in a routing table read from storage. `prep` was added after the table
 * shipped, so an older stored value has no entry for it — inherit `drafting`,
 * which is the route prep ran on before it had its own.
 */
export function normalizeModelRouting(routing: ModelRouting): ModelRouting {
  if (routing.prep && routing.research) return routing
  return {
    ...routing,
    prep: routing.prep ?? routing.drafting,
    research: routing.research ?? "auto"
  }
}

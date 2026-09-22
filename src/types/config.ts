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


/** Where a company-research entry came from, for the provenance line. */
export type ResearchSource = "perplexity" | "search" | "site" | "model"

/**
 * Which source runs company research. `auto` tries every configured source in
 * descending order of how well-grounded it is; naming one pins research to it
 * and reports a clear error instead of quietly answering from a weaker source.
 */
export type ResearchPreference = ResearchSource | "auto"


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


/**
 * Fill in a routing table read from storage. `prep` was added after the table
 * shipped, so an older stored value has no entry for it — inherit `drafting`,
 * which is the route prep ran on before it had its own.
 */

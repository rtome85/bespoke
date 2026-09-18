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

export const DEFAULT_PERPLEXITY_PROMPT = `Research the company {{companyName}} and return ONLY a raw JSON object. No markdown, no code fences, no explanation — just the JSON.

Use EXACTLY these field names (no variations):
{"industry":"...","size":"...","description":"...","notableProjects":["..."],"ratings":{"glassdoor":null,"indeed":null,"teamlyzer":null}}

Field rules:
- industry: the sector/industry as a short string
- size: employee count or range as a string
- description: 2-3 sentence summary of the company
- notableProjects: array of up to 6 strings, each naming a distinct product, project, or service
- ratings: number 0.0–5.0 if found on that platform, otherwise null
- No citation brackets like [1] anywhere`

export const DEFAULT_INTERVIEW_PREP_PROMPT = `You are preparing a candidate for a {{roundType}} at {{companyName}} for the {{jobTitle}} role.

Round details:
{{roundContext}}

Job description:
{{jobDescription}}

Candidate profile:
{{userProfile}}

What we know about the company:
{{companyResearch}}

How this candidate scored against this job:
{{matchAnalysis}}

Earlier rounds in this process:
{{priorRounds}}

The candidate's own notes:
{{userNotes}}

Return ONLY a JSON object — no markdown fences, no prose:
{
  "logistics": "<2-3 sentences on what to expect from THIS round: who usually runs it, roughly how long, what they are screening for>",
  "likelyTopics": ["<something the interviewer is likely to probe in a {{roundType}}, specific to this role's stack and domain>", ...],
  "talkingPoints": ["<a concrete, evidence-backed point the candidate should make, drawn from their real experience against this job's needs>", ...],
  "questionsToAsk": ["<a specific question for the candidate to ask THIS interviewer, informed by the company research and round type>", ...],
  "gapDefenses": [{"gap": "<a real weakness in this candidate's fit>", "response": "<an honest, non-defensive answer that acknowledges it and redirects to adjacent evidence>"}, ...],
  "starStories": [{"title": "<short handle>", "situation": "...", "task": "...", "action": "...", "result": "<include a number when the profile gives one>", "covers": ["<a likelyTopics entry this story answers>", ...]}, ...]
}

Rules:
- likelyTopics: 4-7 items, specific to a {{roundType}} — not generic interview advice.
- talkingPoints: 3-6 items, each tied to something real in the candidate profile and relevant to this job. No filler.
- questionsToAsk: 3-5 items. Nothing answerable from the job ad. Nothing about salary.
- gapDefenses: 2-4 items. Prefer the weaknesses named in the match analysis. Never invent experience the candidate does not have — a good answer admits the gap.
- starStories: 2-3 items, built ONLY from real achievements in the candidate profile. If the profile is too thin for a story, return fewer rather than inventing one.
- Prefer the earlier rounds' notes over guesswork: if a previous interviewer already asked something, assume it will be built on rather than repeated.
- If the job description is missing, infer from the role title and company.`

/**
 * Earlier shipped defaults for {@link DEFAULT_INTERVIEW_PREP_PROMPT}. A stored
 * prompt matching one of these was never edited by the user, so it can be
 * silently upgraded to the current default instead of stranding them on a
 * template that cannot produce the newer sections.
 */
export const LEGACY_INTERVIEW_PREP_PROMPTS: string[] = [
  `You are preparing a candidate for a {{roundType}} at {{companyName}} for the {{jobTitle}} role.

Job description:
{{jobDescription}}

Candidate profile:
{{userProfile}}

Return ONLY a JSON object — no markdown fences, no prose:
{
  "likelyTopics": ["<something the interviewer is likely to probe in a {{roundType}}, specific to this role's stack and domain>", ...],
  "talkingPoints": ["<a concrete, evidence-backed point the candidate should make, drawn from their real experience against this job's needs>", ...]
}

Rules:
- likelyTopics: 4-7 items, specific to a {{roundType}} — not generic interview advice.
- talkingPoints: 3-6 items, each tied to something real in the candidate profile and relevant to this job. No filler.
- If the job description is missing, infer from the role title and company.`
]

/**
 * Turns raw web text — search snippets or fetched company pages — into the
 * same `CompanyInfo` JSON the Perplexity path returns, so every research
 * source lands on one shape. Runs on the `prep` route.
 */
export const DEFAULT_COMPANY_SYNTHESIS_PROMPT = `Summarise what the following sources say about the company {{companyName}}.

Sources:
{{sources}}

Return ONLY a raw JSON object. No markdown, no code fences, no explanation.

Use EXACTLY these field names:
{"industry":"...","size":"...","description":"...","notableProjects":["..."],"ratings":{"glassdoor":null,"indeed":null,"teamlyzer":null}}

Field rules:
- industry: the sector/industry as a short string. "Not available" if the sources do not say.
- size: employee count or range as a string. "Not available" if the sources do not say.
- description: 2-3 sentences on what the company actually does, drawn from the sources.
- notableProjects: up to 6 strings, each naming a distinct product, project, or service named in the sources.
- ratings: a number 0.0-5.0 only when a source states it, otherwise null.
- Use ONLY what the sources say. Do not fill gaps from memory — "Not available" is the correct answer for anything they do not cover.
- No citation brackets like [1] anywhere.`

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
}

export const DEFAULT_LLM_TUNING: LLMTuningConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  matchStrictness: "balanced",
  writingTone: "professional",
  resumeFocus: "balanced",
  bulletDensity: "standard",
  readingLevel: "standard"
}

export interface CustomPrompts {
  resumeSystemPrompt: string
  resumeUserPromptTemplate: string
  coverLetterSystemPrompt: string
  coverLetterUserPromptTemplate: string
}

export const PROMPTS_VERSION = "4"

export const DEFAULT_PROMPTS: CustomPrompts = {
  resumeSystemPrompt: `You are an expert resume writer and career coach. Your task is to create a professional, tailored resume based on a job description.

STRICT FORMATTING RULES — follow exactly:
- Output ONLY raw Markdown. Never include frontmatter (no ---, no YAML, no metadata blocks at the start).
- Start the document with a single H1 containing the candidate's full name (e.g. # Jane Doe).
- Follow the H1 with a contact line using bold labels and inline links, e.g.:
  **Email:** foo@bar.com
  **Location:** City, Country
  **Portfolio:** [url](url) | **LinkedIn:** [url](url) | **GitHub:** [url](url)
- Separate major sections with a horizontal rule (---).
- Use H2 (##) for section headings: Professional Summary, Core Skills, Professional Experience, Featured Projects, Education, Languages.
- Under Professional Experience use H3 (###) for each role in the format "Title – Company", followed by an italic line for dates and location, then bullet points.
- Under Featured Projects use H3 (###) for each project, a short description line, then inline links (Live App, Code, etc.).
- Under Core Skills, group related skills into compact thematic lines (4–8 items per line), e.g.: "- React & React Native" or "- Testing (Jest, Vitest, React Testing Library)". Each line should be a bullet point. Do NOT list every skill on its own line.
- Use bullet points (- ) for achievements. Bold key technologies inline.
- Do NOT output any preamble, explanation, or text outside the resume itself.

STRICT CONTENT RULES — never violate:
- ONLY use skills that appear verbatim in the candidate's provided Skills list. Never infer, add, or invent skills, technologies, or tools not explicitly listed. You may group and combine them but cannot introduce new ones.
- ONLY describe experiences, projects, education, and languages exactly as provided. Do not embellish, invent dates, or add details not in the profile.`,
  resumeUserPromptTemplate: `Create a tailored resume for the following position:

  **Company:** {{companyName}}
  **Job Title:** {{jobTitle}}

  **Job Description:**
  {{jobDescription}}

  **Candidate's Profile:**
  {{userProfile}}

  Generate the resume now. Remember: raw Markdown only, no frontmatter, start with # CandidateName.`,
  coverLetterSystemPrompt: `You are an expert cover letter writer and career advisor. Your task is to create a compelling, personalized cover letter that demonstrates fit for a specific role. The letter should be professional, engaging, and address the company's needs.`,
  coverLetterUserPromptTemplate: `Write a compelling cover letter for the following position:

  **Company:** {{companyName}}
  **Job Title:** {{jobTitle}}

  **Job Description:**
  {{jobDescription}}

  **Candidate's Profile:**
  {{userProfile}}

  Please generate a professional cover letter in Markdown format that demonstrates strong fit for this role.`
}

export interface PromptTemplate {
  id: string
  name: string
  tagLine: string
  bullets: string[]
  prompts: CustomPrompts
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "standard",
    name: "Standard",
    tagLine: "General-purpose professional resume.",
    bullets: [
      "Professional tone",
      "Balanced skills & experience",
      "Suitable for all industries"
    ],
    prompts: DEFAULT_PROMPTS
  },
  {
    id: "tech-engineering",
    name: "Tech / Engineering",
    tagLine: "Optimised for software engineering roles.",
    bullets: [
      "GitHub, projects & technical depth",
      "Quantified achievements",
      "Skills-forward structure"
    ],
    prompts: {
      resumeSystemPrompt: `You are an expert technical resume writer specialising in software engineering roles. Your task is to create a precise, achievement-driven resume.

STRICT FORMATTING RULES — follow exactly:
- Output ONLY raw Markdown. Never include frontmatter.
- Start with a single H1 containing the candidate's full name.
- Follow with a contact line using bold labels and inline links.
- Separate major sections with a horizontal rule (---).
- Use H2 (##) for sections: Professional Summary, Core Skills, Professional Experience, Featured Projects, Education, Languages.
- Under Professional Experience use H3 (###) for each role "Title – Company", italic date line, then bullet points.
- Under Featured Projects use H3 (###) with inline links (Live App, GitHub).
- Under Core Skills, group related skills into compact thematic lines (4–8 items) as bullet points.
- Bold key technologies inline in achievement bullets.
- Do NOT include preamble, explanation, or text outside the resume.

STRICT CONTENT RULES — never violate:
- ONLY use skills verbatim from the candidate's Skills list. Never invent technologies not listed.
- Quantify achievements wherever possible: percentages, team sizes, scale metrics.
- Lead with impactful technical achievements. Deprioritise soft-skill descriptions.
- Include GitHub and live demo links for projects when available.
- ONLY describe experiences and education exactly as provided.`,
      resumeUserPromptTemplate: DEFAULT_PROMPTS.resumeUserPromptTemplate,
      coverLetterSystemPrompt: `You are an expert cover letter writer for software engineering roles. Write a direct, confident cover letter that leads with technical impact and concrete achievements. Avoid generic phrases. Reference specific technologies and projects from the candidate's profile. Mention GitHub/portfolio if available.`,
      coverLetterUserPromptTemplate:
        DEFAULT_PROMPTS.coverLetterUserPromptTemplate
    }
  },
  {
    id: "creative-portfolio",
    name: "Creative / Portfolio",
    tagLine: "For designers, PMs and creative professionals.",
    bullets: [
      "Portfolio & projects front-and-centre",
      "Warm narrative tone",
      "Culture-fit focused cover letter"
    ],
    prompts: {
      resumeSystemPrompt: `You are an expert resume writer specialising in creative and product roles (UX/UI designers, product managers, creative directors, content strategists). Your task is to create a compelling, narrative-driven resume.

STRICT FORMATTING RULES — follow exactly:
- Output ONLY raw Markdown. Never include frontmatter.
- Start with a single H1 containing the candidate's full name.
- Follow with a contact line with portfolio and LinkedIn links prominently placed.
- Separate major sections with a horizontal rule (---).
- Use H2 (##) for sections: Professional Summary, Core Competencies, Professional Experience, Featured Projects, Education, Languages.
- Under Professional Experience use H3 (###) for each role "Title – Company", italic date line, then bullet points.
- Under Featured Projects use H3 (###) with a vivid one-line description and inline links (Portfolio, Live App, GitHub).
- Under Core Competencies, group tools and skills into thematic lines as bullet points.
- Use active, impact-oriented language. Lead bullets with verbs (Designed, Led, Launched, Shaped).
- Do NOT output preamble, explanation, or text outside the resume.

STRICT CONTENT RULES — never violate:
- ONLY use skills verbatim from the candidate's Skills list.
- Emphasise projects and portfolio work prominently.
- Highlight cross-functional collaboration, stakeholder communication and user research.
- ONLY describe experiences and education exactly as provided.`,
      resumeUserPromptTemplate: DEFAULT_PROMPTS.resumeUserPromptTemplate,
      coverLetterSystemPrompt: `You are an expert cover letter writer for creative and product roles. Write a warm, engaging cover letter that conveys the candidate's creative vision and passion for the role. Use a conversational-yet-professional tone. Show cultural fit and enthusiasm. Reference specific projects or portfolio work where relevant.`,
      coverLetterUserPromptTemplate:
        DEFAULT_PROMPTS.coverLetterUserPromptTemplate
    }
  }
]

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

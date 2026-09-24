import type {
  LLMProviderId,
  ModelConfig,
  ModelRouting,
  ProviderConfig,
  ProviderMeta,
  RoutableJob
} from "~types/config"

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
    id: "nemotron-3-nano:30b-cloud",
    name: "Nemotron 3 Nano",
    description:
      "MoE model, fast and reliable for structured generation and CV tailoring.",
    size: "MoE",
    recommended: false,
    costProfile: "high",
    speedProfile: "medium",
    scoringProfile: "generous"
  }
]

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

export function normalizeModelRouting(routing: ModelRouting): ModelRouting {
  if (routing.prep && routing.research) return routing
  return {
    ...routing,
    prep: routing.prep ?? routing.drafting,
    research: routing.research ?? "auto"
  }
}

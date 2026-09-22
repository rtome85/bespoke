import type {
  ResearchPreference,
  ResearchSource,
  SearchConfig,
  SearchEngineId,
  SearchEngineMeta
} from "~types/config"

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

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  engine: "tavily",
  apiKey: "",
  enabled: false
}

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

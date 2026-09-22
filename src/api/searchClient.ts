import { SEARCH_ENGINE_META } from "~constants/research"
import type { SearchConfig, SearchEngineId } from "~types/config"

export interface SearchResult {
  title: string
  url: string
  /** The engine's excerpt — a snippet, description, or page text. */
  snippet: string
}

const TIMEOUT_MS = 20_000

/** Trim an engine's excerpt so a handful of results still fit one prompt. */
const clip = (v: unknown, max = 1200): string =>
  typeof v === "string" ? v.trim().slice(0, max) : ""

const asResults = (raw: unknown, pick: (r: any) => SearchResult) =>
  (Array.isArray(raw) ? raw : [])
    .map(pick)
    .filter((r) => r.url && (r.title || r.snippet))

async function request(
  url: string,
  init: RequestInit,
  engineName: string,
  signal?: AbortSignal
): Promise<any> {
  // Each engine gets its own timeout even when the caller passed no signal,
  // so a hung search cannot hold the research chain open indefinitely.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener("abort", onAbort)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `${engineName} API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }
    return await res.json()
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", onAbort)
  }
}

async function tavily(
  apiKey: string,
  query: string,
  max: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const data = await request(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        max_results: max,
        search_depth: "basic"
      })
    },
    "Tavily",
    signal
  )
  return asResults(data?.results, (r) => ({
    title: clip(r?.title, 200),
    url: clip(r?.url, 500),
    snippet: clip(r?.content)
  }))
}

async function brave(
  apiKey: string,
  query: string,
  max: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}`
  const data = await request(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey
      }
    },
    "Brave Search",
    signal
  )
  return asResults(data?.web?.results, (r) => ({
    title: clip(r?.title, 200),
    url: clip(r?.url, 500),
    snippet: clip(
      [r?.description, ...(r?.extra_snippets ?? [])].filter(Boolean).join(" ")
    )
  }))
}

async function exa(
  apiKey: string,
  query: string,
  max: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const data = await request(
    "https://api.exa.ai/search",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        numResults: max,
        contents: { text: { maxCharacters: 1200 } }
      })
    },
    "Exa",
    signal
  )
  return asResults(data?.results, (r) => ({
    title: clip(r?.title, 200),
    url: clip(r?.url, 500),
    snippet: clip(r?.text || r?.snippet || r?.summary)
  }))
}

/** Is this account usable — enabled, with a key saved? */
export function searchConfigured(
  config?: SearchConfig
): config is SearchConfig {
  return !!config?.enabled && !!config.apiKey?.trim()
}

/**
 * Run one web search on the configured engine. Throws on a transport or
 * credential failure so the research chain can fall through to the next
 * strategy rather than presenting an empty result as an answer.
 */
export async function searchWeb(
  config: SearchConfig,
  query: string,
  max = 6,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const key = config.apiKey.trim()
  switch (config.engine) {
    case "brave":
      return brave(key, query, max, signal)
    case "exa":
      return exa(key, query, max, signal)
    case "tavily":
    default:
      return tavily(key, query, max, signal)
  }
}

/**
 * Cheapest call that proves the key works, for the settings "Test connection"
 * button. Swallows nothing — the caller shows the error text.
 */
export async function testSearchConnection(
  config: SearchConfig
): Promise<boolean> {
  const results = await searchWeb(config, "Bespoke connection test", 1)
  return Array.isArray(results)
}

export const searchEngineName = (engine: SearchEngineId): string =>
  SEARCH_ENGINE_META[engine].name

import { PROVIDER_IDS } from "~constants/options"
import {
  hasProviderCredential,
  PROVIDER_META,
  SEARCH_ENGINE_META,
  type LLMProviderId,
  type PerplexityConfig,
  type ProvidersConfig,
  type SearchConfig
} from "~types/config"
import type { OperationStatus, ProviderTestState } from "~types/options"

/**
 * Roster identity: the routable LLM providers plus the two research accounts —
 * Perplexity and a web-search engine — which have their own config shapes and
 * never run scoring, drafting or prep themselves.
 */
export type RosterProviderId = LLMProviderId | "perplexity" | "websearch"

export type ProviderStatusTone = "ok" | "warn" | "bad" | "idle"

export interface ProviderStatus {
  label: string
  tone: ProviderStatusTone
}

export interface ProviderRosterEntry {
  id: RosterProviderId
  name: string
  /** What using it costs — the roster's ACCESS column. */
  access: string
  /** Secondary line under the name: masked key, host, or why it's empty. */
  meta: string
  /** One-line explanation of what the account costs and does, for the dialog. */
  blurb: string
  status: ProviderStatus
}

const BLURBS: Record<RosterProviderId, string> = {
  ollama:
    "Runs on your machine — no per-token cost, no data leaves the device.",
  openai: "Usage-based API — billed by OpenAI per token.",
  anthropic: "Usage-based API — billed by Anthropic per token.",
  google: "Usage-based API — billed by Google per token.",
  openrouter:
    "One key for hundreds of models — billed by OpenRouter per token.",
  deepseek: "Usage-based API — billed by DeepSeek per token.",
  mistral: "EU-hosted, usage-based API — billed by Mistral per token.",
  custom:
    "Any OpenAI-compatible server — vLLM, LM Studio, LiteLLM, or a hosted gateway.",
  perplexity:
    "Company research only — never scoring, drafting, or interview prep.",
  websearch:
    "Fetches sources for company research; the Interview prep model summarises them."
}

const CONNECTED: ProviderStatus = { label: "Connected", tone: "ok" }
const NOT_CONNECTED: ProviderStatus = { label: "Not connected", tone: "idle" }
const DISABLED: ProviderStatus = { label: "Disabled", tone: "idle" }
const UNTESTED: ProviderStatus = { label: "Key untested", tone: "warn" }
const URL_UNTESTED: ProviderStatus = { label: "URL untested", tone: "warn" }
const FAILED: ProviderStatus = { label: "Test failed", tone: "bad" }
const TESTING: ProviderStatus = { label: "Testing…", tone: "idle" }

/**
 * Show enough of a key to recognise which one is saved, never enough to use
 * it: the vendor prefix, an ellipsis, and the last four characters.
 */
export function maskKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "••••"
  const lastDash = key.slice(0, 9).lastIndexOf("-")
  const prefix = lastDash > 0 ? key.slice(0, lastDash + 1) : key.slice(0, 4)
  return `${prefix}…${key.slice(-4)}`
}

/** Host of a base URL, for the "localhost:11434" line on endpoint rows. */
function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

/**
 * Status of one routable provider.
 *
 * Credentials gate everything: a remote account with no key is never
 * connected, whatever a result in this session claims — `listModels` falls
 * back to the built-in catalogue rather than failing, so a model refresh
 * reports success even when the endpoint rejected the request. Only a
 * connection test is a verdict on reachability, which is why a "models"
 * result is ignored here.
 *
 * After that: a live test wins, then the persisted `lastTested` verdict,
 * and finally whether a key exists at all. A saved-but-never-verified key
 * is called out rather than being reported as connected.
 */
export function providerStatus(
  id: LLMProviderId,
  providers: ProvidersConfig,
  test: ProviderTestState
): ProviderStatus {
  const config = providers[id]
  const local = PROVIDER_META[id].local
  if (!config || !hasProviderCredential(id, config)) return NOT_CONNECTED
  if (config.enabled === false) return DISABLED

  const live = test[id]
  if (live?.source === "test") {
    if (live.type === "loading") return TESTING
    if (live.type === "ok") return CONNECTED
    if (live.type === "err") return FAILED
  }

  if (config.lastTested) return config.lastTested.ok ? CONNECTED : FAILED
  if (local) return CONNECTED
  return PROVIDER_META[id].credential === "baseUrl" ? URL_UNTESTED : UNTESTED
}

/**
 * Status of the Perplexity account. Same rule as `providerStatus`: a saved
 * key is not a connected one. Its verdict is voided whenever the key
 * changes (see `changePerplexityConfig`), so a stored pass always refers to
 * the key currently in the field.
 */
export function perplexityStatus(
  config: PerplexityConfig,
  test: OperationStatus
): ProviderStatus {
  if (!config.apiKey) return NOT_CONNECTED
  if (!config.enabled) return DISABLED
  if (test.type === "loading") return TESTING
  if (test.type === "success") return CONNECTED
  if (test.type === "error") return FAILED
  if (config.lastTested) return config.lastTested.ok ? CONNECTED : FAILED
  return UNTESTED
}

/**
 * Status of the web-search account. Same rule as the others: a saved key is
 * not a connected one until something has exercised it.
 */
export function searchStatus(
  config: SearchConfig,
  test: OperationStatus
): ProviderStatus {
  if (!config.apiKey) return NOT_CONNECTED
  if (!config.enabled) return DISABLED
  if (test.type === "loading") return TESTING
  if (test.type === "success") return CONNECTED
  if (test.type === "error") return FAILED
  if (config.lastTested) return config.lastTested.ok ? CONNECTED : FAILED
  return UNTESTED
}

/** Every row of the providers roster, in display order. */
export function providerRoster(
  providers: ProvidersConfig,
  perplexityConfig: PerplexityConfig,
  test: ProviderTestState,
  perplexityTest: OperationStatus,
  searchConfig: SearchConfig,
  searchTest: OperationStatus
): ProviderRosterEntry[] {
  const rows: ProviderRosterEntry[] = PROVIDER_IDS.map((id) => {
    const meta = PROVIDER_META[id]
    const config = providers[id]
    return {
      id,
      name: meta.name,
      access: meta.local
        ? "Local · Free"
        : meta.credential === "baseUrl"
          ? "Self-hosted"
          : "Usage-based",
      meta:
        meta.local || meta.credential === "baseUrl"
          ? hostOf(config?.baseUrl || meta.defaultBaseUrl || "") ||
            "No URL saved"
          : config?.apiKey
            ? maskKey(config.apiKey)
            : "No key saved",
      blurb: BLURBS[id],
      status: providerStatus(id, providers, test)
    }
  })

  rows.push({
    id: "perplexity",
    name: "Perplexity",
    access: "Research only",
    meta: perplexityConfig.apiKey
      ? maskKey(perplexityConfig.apiKey)
      : "No key saved",
    blurb: BLURBS.perplexity,
    status: perplexityStatus(perplexityConfig, perplexityTest)
  })

  rows.push({
    id: "websearch",
    name: SEARCH_ENGINE_META[searchConfig.engine].name,
    access: "Research only",
    meta: searchConfig.apiKey ? maskKey(searchConfig.apiKey) : "No key saved",
    blurb: BLURBS.websearch,
    status: searchStatus(searchConfig, searchTest)
  })

  return rows
}

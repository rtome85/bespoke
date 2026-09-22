import { DEFAULT_LLM_TUNING } from "~constants/generation"
import { DEFAULT_PROMPTS } from "~constants/prompts"
import {
  DEFAULT_MODEL_ROUTING,
  hasProviderCredential,
  normalizeModelRouting,
  PROVIDER_META
} from "~constants/providers"
import { STORAGE_KEYS } from "~storage/keys"
import type {
  CustomPrompts,
  GenerateRequest,
  LLMProviderId,
  LLMTuningConfig,
  ModelRouting,
  ProviderConfig,
  ProvidersConfig,
  RoutableJob,
  RouteTarget
} from "~types/config"
import type { PendingJobData } from "~types/dialog"
import type { UserProfile } from "~types/userProfile"

interface MessageBody {
  companyName: string
  jobTitle: string
  userProfile?: UserProfile
  jobDescription?: string
}

/** The pre-multi-provider shape `ollamaConfig` was saved under. */
interface LegacyOllamaConfig {
  apiKey?: string
  baseUrl?: string
  enabled?: boolean
}

interface RoutingStorageRecord {
  providers?: ProvidersConfig
  modelRouting?: ModelRouting
  ollamaConfig?: LegacyOllamaConfig
  lastSelectedModel?: string
}

interface GenerateRequestStorageRecord {
  customPrompts?: CustomPrompts
  pendingJobData?: PendingJobData
  llmTuning?: Partial<LLMTuningConfig>
}

export interface ResolvedRoute {
  provider: LLMProviderId
  clientConfig: Pick<ProviderConfig, "apiKey" | "baseUrl">
  model: string
}

type PrepareResult =
  | {
      ok: true
      request: GenerateRequest
      primary: ResolvedRoute
      fallback?: ResolvedRoute
    }
  | { ok: false; message: string }

/**
 * Derive a providers map + routing from the legacy ollamaConfig +
 * lastSelectedModel, so existing users keep working with no visible change.
 */
function migrate(
  ollamaConfig: LegacyOllamaConfig | undefined,
  lastSelectedModel: string | undefined
): { providers: ProvidersConfig; routing: ModelRouting } {
  const model = lastSelectedModel || DEFAULT_MODEL_ROUTING.scoring.model
  return {
    providers: {
      ollama: {
        apiKey: ollamaConfig?.apiKey ?? "",
        baseUrl: ollamaConfig?.baseUrl,
        enabled: ollamaConfig?.enabled ?? false
      }
    },
    routing: {
      scoring: { provider: "ollama", model },
      drafting: { provider: "ollama", model },
      prep: { provider: "ollama", model },
      fallback: { enabled: false, target: { provider: "ollama", model } }
    }
  }
}

function resolve(
  target: RouteTarget,
  providers: ProvidersConfig
): ResolvedRoute | { error: string } {
  const cfg = providers[target.provider]
  const meta = PROVIDER_META[target.provider]
  // Storage is not only written by the settings UI: a Drive restore copies a
  // routing table in wholesale, so an unknown provider can reach here without
  // passing the importer's validation. Say so, rather than reading `.name`
  // off nothing a line later.
  if (!meta) {
    return {
      error: `Unknown provider "${String(target.provider).slice(0, 40)}" in Model routing. Pick a model in Settings.`
    }
  }
  if (!cfg || cfg.enabled === false) {
    return { error: `${meta.name} is not connected. Connect it in Settings.` }
  }
  if (!hasProviderCredential(target.provider, cfg)) {
    return {
      error:
        meta.credential === "baseUrl"
          ? `${meta.name} needs a base URL. Add it in Settings.`
          : `${meta.name} needs an API key. Add it in Settings.`
    }
  }
  if (target.provider === "ollama" && !cfg.apiKey) {
    return {
      error: "Ollama API key not configured. Please set it in Settings."
    }
  }
  return {
    provider: target.provider,
    clientConfig: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl },
    model: target.model
  }
}

/**
 * Load the providers map + routing table from storage, applying the legacy
 * `ollamaConfig` migration shim so existing users keep working.
 */
async function loadProvidersAndRouting(): Promise<{
  providers: ProvidersConfig
  routing: ModelRouting
}> {
  const s = await new Promise<RoutingStorageRecord>((res) => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.PROVIDERS,
        STORAGE_KEYS.MODEL_ROUTING,
        STORAGE_KEYS.OLLAMA_CONFIG,
        STORAGE_KEYS.LAST_SELECTED_MODEL
      ],
      (items) => res(items as RoutingStorageRecord)
    )
  })
  const storedProviders = s.providers
  const storedRouting = s.modelRouting
  if (storedProviders && storedRouting) {
    return {
      providers: storedProviders,
      routing: normalizeModelRouting(storedRouting)
    }
  }
  const m = migrate(s.ollamaConfig, s.lastSelectedModel)
  return {
    providers: { ...m.providers, ...(storedProviders ?? {}) },
    routing: normalizeModelRouting(storedRouting ?? m.routing)
  }
}

/**
 * Resolve the provider + model + credentials for a routable job — for callers
 * (per-round Prep) that build their own request rather than the
 * resume/cover-letter `GenerateRequest`. Mirrors `prepareGenerateRequest`:
 * returns the primary route plus the configured fallback (when enabled and it
 * resolves) so the caller can retry on it.
 */
export async function resolveJobRoute(
  job: RoutableJob
): Promise<
  { primary: ResolvedRoute; fallback?: ResolvedRoute } | { error: string }
> {
  const { providers, routing } = await loadProvidersAndRouting()
  // Normalized above, so every job has a target.
  const primary = resolve(routing[job] as RouteTarget, providers)
  if ("error" in primary) return { error: primary.error }

  let fallback: ResolvedRoute | undefined
  if (routing.fallback?.enabled) {
    const fb = resolve(routing.fallback.target, providers)
    if (!("error" in fb)) fallback = fb
  }
  return { primary, fallback }
}

/**
 * Reads config from storage and builds the GenerateRequest + resolved
 * provider route(s) for a given job.
 */
export async function prepareGenerateRequest(
  body: MessageBody,
  job: RoutableJob
): Promise<PrepareResult> {
  const storage = await new Promise<GenerateRequestStorageRecord>(
    (resolve) => {
      chrome.storage.local.get(
        [
          STORAGE_KEYS.CUSTOM_PROMPTS,
          STORAGE_KEYS.PENDING_JOB_DATA,
          STORAGE_KEYS.LLM_TUNING
        ],
        (items) => resolve(items as GenerateRequestStorageRecord)
      )
    }
  )

  const customPrompts = storage.customPrompts || DEFAULT_PROMPTS
  // Spread over the defaults rather than picking one or the other: a tuning
  // object saved before a setting existed (outputLanguage, say) is otherwise
  // missing that key entirely.
  const llmTuning: LLMTuningConfig = {
    ...DEFAULT_LLM_TUNING,
    ...(storage.llmTuning ?? {})
  }
  const jobData = storage.pendingJobData

  const { providers, routing } = await loadProvidersAndRouting()

  // The Model routing page is the single source of truth for which
  // provider + model runs each job. Callers no longer pass a model.
  const primary = resolve(routing[job] as RouteTarget, providers)
  if ("error" in primary) {
    return { ok: false, message: primary.error }
  }

  let fallback: ResolvedRoute | undefined
  if (routing.fallback?.enabled) {
    const fb = resolve(routing.fallback.target, providers)
    if (!("error" in fb)) fallback = fb
  }

  const effectiveJobDescription = body.jobDescription || jobData?.selectedText
  if (!effectiveJobDescription) {
    return {
      ok: false,
      message:
        "No job description found. Right-click on a job posting and select 'Check my match for this job'."
    }
  }

  return {
    ok: true,
    request: {
      jobDescription: effectiveJobDescription,
      companyName: body.companyName,
      jobTitle: body.jobTitle,
      model: primary.model,
      prompts: customPrompts,
      userProfile: body.userProfile,
      llmTuning
    },
    primary,
    fallback
  }
}

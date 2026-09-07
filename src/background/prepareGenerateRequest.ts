import { STORAGE_KEYS } from "~storage/keys"
import type {
  GenerateRequest,
  LLMProviderId,
  ModelRouting,
  ProviderConfig,
  ProvidersConfig,
  RoutableJob,
  RouteTarget
} from "~types/config"
import {
  DEFAULT_LLM_TUNING,
  DEFAULT_MODEL_ROUTING,
  DEFAULT_PROMPTS,
  PROVIDER_META
} from "~types/config"
import type { UserProfile } from "~types/userProfile"

interface MessageBody {
  companyName: string
  jobTitle: string
  userProfile?: UserProfile
  jobDescription?: string
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
  ollamaConfig: any,
  lastSelectedModel: string | undefined
): { providers: ProvidersConfig; routing: ModelRouting } {
  const model = lastSelectedModel || DEFAULT_MODEL_ROUTING.scoring.model
  return {
    providers: {
      ollama: {
        apiKey: ollamaConfig?.apiKey ?? "",
        baseUrl: ollamaConfig?.baseUrl,
        enabled: true
      }
    },
    routing: {
      scoring: { provider: "ollama", model },
      drafting: { provider: "ollama", model },
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
  if (!cfg || cfg.enabled === false) {
    return { error: `${meta.name} is not connected. Connect it in Settings.` }
  }
  if (!meta.local && !cfg.apiKey) {
    return { error: `${meta.name} needs an API key. Add it in Settings.` }
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
  const s = await new Promise<any>((res) => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.PROVIDERS,
        STORAGE_KEYS.MODEL_ROUTING,
        STORAGE_KEYS.OLLAMA_CONFIG,
        STORAGE_KEYS.LAST_SELECTED_MODEL
      ],
      res
    )
  })
  const storedProviders = s[STORAGE_KEYS.PROVIDERS] as ProvidersConfig | undefined
  const storedRouting = s[STORAGE_KEYS.MODEL_ROUTING] as ModelRouting | undefined
  if (storedProviders && storedRouting) {
    return { providers: storedProviders, routing: storedRouting }
  }
  const m = migrate(
    s[STORAGE_KEYS.OLLAMA_CONFIG],
    s[STORAGE_KEYS.LAST_SELECTED_MODEL]
  )
  return {
    providers: { ...m.providers, ...(storedProviders ?? {}) },
    routing: storedRouting ?? m.routing
  }
}

/**
 * Resolve just the provider + model + credentials for a routable job — for
 * callers (per-round Prep) that build their own request rather than the
 * resume/cover-letter `GenerateRequest`.
 */
export async function resolveJobRoute(
  job: RoutableJob
): Promise<ResolvedRoute | { error: string }> {
  const { providers, routing } = await loadProvidersAndRouting()
  return resolve(routing[job], providers)
}

/**
 * Reads config from storage and builds the GenerateRequest + resolved
 * provider route(s) for a given job.
 */
export async function prepareGenerateRequest(
  body: MessageBody,
  job: RoutableJob
): Promise<PrepareResult> {
  const storage = await new Promise<any>((resolve) => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.CUSTOM_PROMPTS,
        STORAGE_KEYS.PENDING_JOB_DATA,
        STORAGE_KEYS.LLM_TUNING
      ],
      resolve
    )
  })

  const customPrompts = storage[STORAGE_KEYS.CUSTOM_PROMPTS] || DEFAULT_PROMPTS
  const llmTuning = storage[STORAGE_KEYS.LLM_TUNING] || DEFAULT_LLM_TUNING
  const jobData = storage[STORAGE_KEYS.PENDING_JOB_DATA]

  const { providers, routing } = await loadProvidersAndRouting()

  // The Model routing page is the single source of truth for which
  // provider + model runs each job. Callers no longer pass a model.
  const primary = resolve(routing[job], providers)
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

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
  model?: string
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
        STORAGE_KEYS.PROVIDERS,
        STORAGE_KEYS.MODEL_ROUTING,
        STORAGE_KEYS.OLLAMA_CONFIG,
        STORAGE_KEYS.CUSTOM_PROMPTS,
        STORAGE_KEYS.LAST_SELECTED_MODEL,
        STORAGE_KEYS.PENDING_JOB_DATA,
        STORAGE_KEYS.LLM_TUNING
      ],
      resolve
    )
  })

  const customPrompts = storage[STORAGE_KEYS.CUSTOM_PROMPTS] || DEFAULT_PROMPTS
  const llmTuning = storage[STORAGE_KEYS.LLM_TUNING] || DEFAULT_LLM_TUNING
  const jobData = storage[STORAGE_KEYS.PENDING_JOB_DATA]

  const storedProviders = storage[STORAGE_KEYS.PROVIDERS] as
    | ProvidersConfig
    | undefined
  const storedRouting = storage[STORAGE_KEYS.MODEL_ROUTING] as
    | ModelRouting
    | undefined

  let providers: ProvidersConfig
  let routing: ModelRouting
  if (storedProviders && storedRouting) {
    providers = storedProviders
    routing = storedRouting
  } else {
    const m = migrate(
      storage[STORAGE_KEYS.OLLAMA_CONFIG],
      storage[STORAGE_KEYS.LAST_SELECTED_MODEL]
    )
    providers = { ...m.providers, ...(storedProviders ?? {}) }
    routing = storedRouting ?? m.routing
  }

  const primaryTarget: RouteTarget = body.model
    ? { ...routing[job], model: body.model }
    : routing[job]

  const primary = resolve(primaryTarget, providers)
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

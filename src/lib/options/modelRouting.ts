import { PROVIDER_IDS } from "~constants/options"
import {
  AVAILABLE_MODELS,
  MODEL_COST_PER_MTOK,
  PROVIDER_META,
  RUN_TOKENS,
  type LLMProviderId,
  type ProvidersConfig,
  type RoutableJob,
  type RouteTarget
} from "~types/config"

export function encodeRoute(target: RouteTarget): string {
  return `${target.provider}::${target.model}`
}

export function decodeRoute(value: string): RouteTarget {
  const separatorIndex = value.indexOf("::")
  return {
    provider: value.slice(0, separatorIndex) as LLMProviderId,
    model: value.slice(separatorIndex + 2)
  }
}

export function providerModels(
  provider: LLMProviderId,
  providers: ProvidersConfig
): string[] {
  const stored = providers[provider]?.models
  if (stored?.length) return stored
  if (provider === "ollama") return AVAILABLE_MODELS.map((model) => model.id)
  return PROVIDER_META[provider].fallbackModels
}

export function connectedProviders(
  providers: ProvidersConfig
): LLMProviderId[] {
  return PROVIDER_IDS.filter((provider) => {
    const config = providers[provider]
    if (!config || config.enabled === false) return false
    return PROVIDER_META[provider].local || !!config.apiKey
  })
}

/** Rough $/run for the cost hint; null when the model has no price (local). */
export function runCost(model: string, job: RoutableJob): number | null {
  const costPerMillionTokens = MODEL_COST_PER_MTOK[model]
  if (costPerMillionTokens == null) return null
  return (costPerMillionTokens * RUN_TOKENS[job]) / 1_000_000
}

export function fmtCost(cost: number): string {
  return cost < 0.01 ? `<$0.01` : `$${cost.toFixed(cost < 1 ? 3 : 2)}`
}

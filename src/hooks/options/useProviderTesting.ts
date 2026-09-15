import { useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import type {
  LLMProviderId,
  ProviderConfig,
  ProvidersConfig
} from "~types/config"
import type { ProviderTestState } from "~types/options"

interface Args {
  providers: ProvidersConfig
  updateProvider: (id: LLMProviderId, patch: Partial<ProviderConfig>) => void
}

export function useProviderTesting({ providers, updateProvider }: Args) {
  const [providerTest, setProviderTest] = useState<ProviderTestState>({})

  const testProvider = async (id: LLMProviderId) => {
    setProviderTest((state) => ({
      ...state,
      [id]: { type: "loading", message: "", source: "test" }
    }))
    try {
      const result = await sendToBackground({
        name: "testOllamaConnection",
        body: {
          provider: id,
          apiKey: providers[id]?.apiKey ?? "",
          baseUrl: providers[id]?.baseUrl
        }
      })
      const message =
        result?.message ?? (result?.success ? "Connected." : "Failed.")
      updateProvider(id, {
        lastTested: {
          ok: !!result?.success,
          at: new Date().toISOString(),
          message
        }
      })
      setProviderTest((state) => ({
        ...state,
        [id]: { type: result?.success ? "ok" : "err", message, source: "test" }
      }))
    } catch {
      updateProvider(id, {
        lastTested: {
          ok: false,
          at: new Date().toISOString(),
          message: "Connection failed."
        }
      })
      setProviderTest((state) => ({
        ...state,
        [id]: { type: "err", message: "Connection failed.", source: "test" }
      }))
    }
  }

  const refreshProviderModels = async (id: LLMProviderId) => {
    setProviderTest((state) => ({
      ...state,
      [id]: { type: "loading", message: "", source: "models" }
    }))
    try {
      const result = await sendToBackground({
        name: "listProviderModels",
        body: {
          provider: id,
          apiKey: providers[id]?.apiKey ?? "",
          baseUrl: providers[id]?.baseUrl
        }
      })
      if (result?.success && Array.isArray(result.models)) {
        updateProvider(id, { models: result.models })
      }
      setProviderTest((state) => ({
        ...state,
        [id]: {
          type: result?.success ? "ok" : "err",
          message: result?.success
            ? `${result.models.length} models`
            : result?.message ?? "Failed to list models",
          source: "models"
        }
      }))
    } catch {
      setProviderTest((state) => ({
        ...state,
        [id]: {
          type: "err",
          message: "Failed to list models.",
          source: "models"
        }
      }))
    }
  }

  return { providerTest, testProvider, refreshProviderModels }
}

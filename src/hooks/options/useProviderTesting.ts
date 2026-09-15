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
      [id]: { type: "loading", message: "" }
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
        [id]: { type: result?.success ? "ok" : "err", message }
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
        [id]: { type: "err", message: "Connection failed." }
      }))
    }
  }

  const refreshProviderModels = async (id: LLMProviderId) => {
    setProviderTest((state) => ({
      ...state,
      [id]: { type: "loading", message: "" }
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
      const listed = Array.isArray(result?.models)
      updateProvider(id, {
        ...(listed ? { models: result.models } : {}),
        lastTested: {
          ok: !!result?.success,
          at: new Date().toISOString(),
          message: result?.success
            ? `${result.models.length} models`
            : result?.message ?? "Failed to list models"
        }
      })
      setProviderTest((state) => ({
        ...state,
        [id]: {
          type: result?.success ? "ok" : "err",
          message: result?.success
            ? `${result.models.length} models`
            : result?.message ?? "Failed to list models"
        }
      }))
    } catch {
      setProviderTest((state) => ({
        ...state,
        [id]: { type: "err", message: "Failed to list models." }
      }))
    }
  }

  return { providerTest, testProvider, refreshProviderModels }
}

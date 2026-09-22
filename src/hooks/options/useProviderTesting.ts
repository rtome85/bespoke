import { useRef, useState } from "react"

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
  const runRef = useRef<Partial<Record<LLMProviderId, number>>>({})

  /**
   * Claims the provider's slot and hands back a check for whether this run
   * is still the live one. Both hooks outlive the dialog that starts them,
   * so every write after an `await` has to ask first.
   */
  const beginRun = (id: LLMProviderId) => {
    const run = (runRef.current[id] ?? 0) + 1
    runRef.current[id] = run
    return () => runRef.current[id] === run
  }

  /**
   * Abandons whatever is in flight for a provider: the completion finds its
   * run superseded and writes nothing. Called when the dialog is cancelled,
   * so a test of a discarded draft cannot land on the restored config.
   */
  const cancelProviderOperations = (id: LLMProviderId) => {
    runRef.current[id] = (runRef.current[id] ?? 0) + 1
    setProviderTest((state) => ({
      ...state,
      [id]: { type: "idle", message: "" }
    }))
  }

  const testProvider = async (id: LLMProviderId) => {
    const isCurrent = beginRun(id)
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
      if (!isCurrent()) return
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
      if (!isCurrent()) return
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
    const isCurrent = beginRun(id)
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
      if (!isCurrent()) return
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
      if (!isCurrent()) return
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

  return {
    providerTest,
    testProvider,
    refreshProviderModels,
    cancelProviderOperations
  }
}

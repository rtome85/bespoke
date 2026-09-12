import { useEffect } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import {
  DEFAULT_MODEL_ROUTING,
  PROVIDER_META,
  type ModelRouting,
  type ProvidersConfig
} from "~types/config"

type StorageSetter<T> = (value: T | ((previous: T) => T)) => void

export function useLegacyProviderMigration(
  setProviders: StorageSetter<ProvidersConfig>,
  setModelRouting: StorageSetter<ModelRouting>
) {
  useEffect(() => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.PROVIDERS,
        STORAGE_KEYS.MODEL_ROUTING,
        STORAGE_KEYS.OLLAMA_CONFIG,
        STORAGE_KEYS.LAST_SELECTED_MODEL
      ],
      (result) => {
        if (result[STORAGE_KEYS.PROVIDERS]) return

        const model =
          result[STORAGE_KEYS.LAST_SELECTED_MODEL] ||
          DEFAULT_MODEL_ROUTING.scoring.model
        const legacyOllama = result[STORAGE_KEYS.OLLAMA_CONFIG]
        const enabled = legacyOllama?.enabled ?? false
        const seededProviders: ProvidersConfig = {
          ollama: {
            apiKey: legacyOllama?.apiKey ?? "",
            baseUrl:
              legacyOllama?.baseUrl ?? PROVIDER_META.ollama.defaultBaseUrl,
            enabled
          }
        }
        const existingRouting: ModelRouting | undefined =
          result[STORAGE_KEYS.MODEL_ROUTING]
        // Only seed a default ollama route when the legacy provider was
        // actually enabled — a disabled provider shouldn't get routed to.
        const seededRouting: ModelRouting | undefined =
          existingRouting ??
          (enabled
            ? {
                scoring: { provider: "ollama", model },
                drafting: { provider: "ollama", model },
                fallback: {
                  enabled: false,
                  target: { provider: "ollama", model }
                }
              }
            : undefined)

        const toStore: Record<string, unknown> = {
          [STORAGE_KEYS.PROVIDERS]: seededProviders
        }
        if (seededRouting) toStore[STORAGE_KEYS.MODEL_ROUTING] = seededRouting

        chrome.storage.local.set(toStore)
        setProviders(seededProviders)
        if (seededRouting) setModelRouting(seededRouting)
      }
    )
  }, [setModelRouting, setProviders])
}

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
        const seededProviders: ProvidersConfig = {
          ollama: {
            apiKey: legacyOllama?.apiKey ?? "",
            baseUrl:
              legacyOllama?.baseUrl ?? PROVIDER_META.ollama.defaultBaseUrl,
            enabled: true
          }
        }
        const seededRouting: ModelRouting = result[
          STORAGE_KEYS.MODEL_ROUTING
        ] ?? {
          scoring: { provider: "ollama", model },
          drafting: { provider: "ollama", model },
          fallback: {
            enabled: false,
            target: { provider: "ollama", model }
          }
        }

        chrome.storage.local.set({
          [STORAGE_KEYS.PROVIDERS]: seededProviders,
          [STORAGE_KEYS.MODEL_ROUTING]: seededRouting
        })
        setProviders(seededProviders)
        setModelRouting(seededRouting)
      }
    )
  }, [setModelRouting, setProviders])
}

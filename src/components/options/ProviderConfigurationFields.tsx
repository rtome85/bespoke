import { RefreshCw } from "lucide-react"

import {
  PROVIDER_META,
  type LLMProviderId,
  type ProviderConfig
} from "~types/config"
import type { ProviderTestResult } from "~types/options"

interface Props {
  id: LLMProviderId
  config: ProviderConfig | undefined
  models: string[]
  test: ProviderTestResult | undefined
  onUpdate: (patch: Partial<ProviderConfig>) => void
  onTest: () => void
  onRefreshModels: () => void
}

export function ProviderConfigurationFields({
  id,
  config,
  models,
  test,
  onUpdate,
  onTest,
  onRefreshModels
}: Props) {
  const meta = PROVIDER_META[id]
  const apiKeyId = `provider-${id}-api-key`
  const baseUrlId = `provider-${id}-base-url`

  return (
    <div className="border-t border-aa-border p-aa-5 space-y-5">
      {meta.local && (
        <div>
          <span className="aa-label">Endpoint</span>
          <div className="inline-flex rounded-aa-md border border-aa-border p-aa-px-3">
            {[
              {
                label: "Ollama Cloud",
                url: meta.defaultBaseUrl as string
              },
              {
                label: "Local",
                url: "http://localhost:11434/api"
              }
            ].map((option) => {
              const selected =
                (config?.baseUrl ?? meta.defaultBaseUrl) === option.url
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onUpdate({ baseUrl: option.url })}
                  className={`px-3 py-1.5 rounded-aa-sm text-aa-caption font-semibold transition-colors ${
                    selected
                      ? "bg-aa-primary text-aa-text-on-primary"
                      : "text-aa-text-secondary hover:text-aa-text-primary"
                  }`}>
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label htmlFor={apiKeyId} className="aa-label">
          API key{meta.local ? " (cloud only)" : " *"}
        </label>
        <input
          id={apiKeyId}
          type="password"
          value={config?.apiKey ?? ""}
          onChange={(event) => onUpdate({ apiKey: event.target.value })}
          placeholder={
            id === "ollama"
              ? "oll-…"
              : id === "openai"
                ? "sk-…"
                : id === "anthropic"
                  ? "sk-ant-…"
                  : "AIza…"
          }
          className="aa-input"
        />
        {meta.keyUrl && (
          <p className="aa-hint">
            Get a key from{" "}
            <a
              href={meta.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-aa-primary hover:underline">
              {meta.keyUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}
      </div>

      <div>
        <label htmlFor={baseUrlId} className="aa-label">
          Base URL
        </label>
        <input
          id={baseUrlId}
          type="text"
          value={config?.baseUrl ?? ""}
          onChange={(event) => onUpdate({ baseUrl: event.target.value })}
          placeholder={meta.defaultBaseUrl}
          className="aa-input"
        />
        <p className="aa-hint">
          {meta.local
            ? "Edit to use a remote host, container name, or custom port."
            : "Leave blank unless you use a proxy or gateway."}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onTest}
          disabled={test?.type === "loading"}
          className="aa-btn-outline">
          {test?.type === "loading" ? "Testing…" : "Test connection"}
        </button>
        <button
          type="button"
          onClick={onRefreshModels}
          disabled={test?.type === "loading"}
          className="aa-btn-secondary">
          <RefreshCw className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
          Refresh models
        </button>
        {test && test.type !== "loading" && test.message && (
          <span
            className={`text-aa-caption font-semibold ${
              test.type === "ok"
                ? "text-aa-success-strong"
                : "text-aa-error-strong"
            }`}>
            {test.message}
          </span>
        )}
      </div>

      <div>
        <span className="aa-label">Available models</span>
        <div className="flex flex-wrap gap-1.5">
          {models.map((model) => (
            <span
              key={model}
              className="text-aa-11 font-mono rounded-aa-sm border border-aa-border bg-aa-neutral-50 px-2 py-1 text-aa-text-secondary">
              {model}
            </span>
          ))}
        </div>
        {!config?.models?.length && (
          <p className="aa-hint">
            Built-in list. Test the connection, then refresh to pull the live
            catalogue.
          </p>
        )}
      </div>
    </div>
  )
}

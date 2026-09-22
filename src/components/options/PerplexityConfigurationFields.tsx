import type { PerplexityConfig } from "~types/config"
import type { OperationStatus } from "~types/options"

interface Props {
  config: PerplexityConfig
  testStatus: OperationStatus
  onChange: (config: PerplexityConfig) => void
  onTest: () => void
  onOpenPrompts: () => void
}

/**
 * Perplexity's settings body. Separate from the routable providers because
 * the account has its own config shape (an enable flag, no model list) and
 * only ever powers company research.
 */
export function PerplexityConfigurationFields({
  config,
  testStatus,
  onChange,
  onTest,
  onOpenPrompts
}: Props) {
  return (
    <div className="p-aa-px-22 space-y-5">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(event) =>
            onChange({ ...config, enabled: event.target.checked })
          }
          className="w-4 h-4 accent-aa-primary"
        />
        <span className="text-sm font-medium text-aa-text-primary">
          Enable company research
        </span>
      </label>

      <div>
        <label htmlFor="perplexity-api-key" className="aa-label">
          API key *
        </label>
        <input
          id="perplexity-api-key"
          type="password"
          value={config.apiKey}
          onChange={(event) =>
            onChange({ ...config, apiKey: event.target.value })
          }
          placeholder="pplx-…"
          className="aa-input"
        />
        <p className="aa-hint">
          Get a key from{" "}
          <a
            href="https://www.perplexity.ai/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-aa-primary hover:underline">
            perplexity.ai/settings/api
          </a>
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onTest}
          disabled={testStatus.type === "loading"}
          className="aa-btn-outline">
          {testStatus.type === "loading" ? "Testing…" : "Test connection"}
        </button>
        {testStatus.type === "success" && (
          <span className="text-aa-caption font-semibold text-aa-success-strong">
            {testStatus.message}
          </span>
        )}
        {testStatus.type === "error" && (
          <span className="text-aa-caption font-semibold text-aa-error-strong">
            {testStatus.message}
          </span>
        )}
      </div>

      <p className="aa-hint">
        The company research prompt lives on the{" "}
        <button
          type="button"
          onClick={onOpenPrompts}
          className="text-aa-primary hover:underline bg-transparent border-0 p-0 cursor-pointer font-semibold">
          Prompts
        </button>{" "}
        page.
      </p>
    </div>
  )
}

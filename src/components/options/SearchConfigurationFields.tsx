import {
  SEARCH_ENGINE_IDS,
  SEARCH_ENGINE_META,
  type SearchConfig,
  type SearchEngineId
} from "~types/config"
import type { OperationStatus } from "~types/options"

interface Props {
  config: SearchConfig
  testStatus: OperationStatus
  onChange: (config: SearchConfig) => void
  onTest: () => void
}

/**
 * The web-search account's settings. Separate from the routable LLM providers
 * because it isn't one: it fetches sources, and whichever model the `prep`
 * route points at summarises them.
 */
export function SearchConfigurationFields({
  config,
  testStatus,
  onChange,
  onTest
}: Props) {
  const meta = SEARCH_ENGINE_META[config.engine]

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
          Use web search for company research
        </span>
      </label>

      <div>
        <label htmlFor="search-engine" className="aa-label">
          Search engine
        </label>
        <select
          id="search-engine"
          value={config.engine}
          onChange={(event) =>
            onChange({
              ...config,
              engine: event.target.value as SearchEngineId
            })
          }
          className="aa-input">
          {SEARCH_ENGINE_IDS.map((id) => (
            <option key={id} value={id}>
              {SEARCH_ENGINE_META[id].name} — {SEARCH_ENGINE_META[id].access}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="search-api-key" className="aa-label">
          API key *
        </label>
        <input
          id="search-api-key"
          type="password"
          value={config.apiKey}
          onChange={(event) =>
            onChange({ ...config, apiKey: event.target.value })
          }
          placeholder={meta.keyPlaceholder}
          className="aa-input"
        />
        <p className="aa-hint">
          Get a key from{" "}
          <a
            href={meta.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-aa-primary hover:underline">
            {meta.name}
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
        {/* The verdict is the only feedback this button gives, and it appears
            without moving focus. `status` is polite enough for a pass;
            `alert` (assertive, atomic) interrupts for a failure, which is the
            one the user has to act on. */}
        {testStatus.type === "success" && (
          <span
            role="status"
            className="text-aa-caption font-semibold text-aa-success-strong">
            {testStatus.message}
          </span>
        )}
        {testStatus.type === "error" && (
          <span
            role="alert"
            className="text-aa-caption font-semibold text-aa-error-strong">
            {testStatus.message}
          </span>
        )}
      </div>

      <p className="aa-hint">
        Research tries Perplexity first, then this search engine, then the
        company's own website. Whichever answers, the model on the{" "}
        <strong>Interview prep</strong> route writes the summary.
      </p>
    </div>
  )
}

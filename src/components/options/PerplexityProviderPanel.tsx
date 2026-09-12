import { ChevronDown } from "lucide-react"

import {
  HINT_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  OUTLINE_BUTTON_CLASS
} from "~constants/options"
import type { PerplexityConfig } from "~types/config"
import type { OperationStatus } from "~types/options"

interface Props {
  config: PerplexityConfig
  isOpen: boolean
  testStatus: OperationStatus
  onToggle: () => void
  onChange: (config: PerplexityConfig) => void
  onTest: () => void
  onOpenPrompts: () => void
}

export function PerplexityProviderPanel({
  config,
  isOpen,
  testStatus,
  onToggle,
  onChange,
  onTest,
  onOpenPrompts
}: Props) {
  const isConnected = config.enabled && config.apiKey

  return (
    <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-4 p-aa-5 text-left hover:bg-aa-neutral-50 transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-aa-md bg-aa-primary-soft text-aa-primary font-bold text-sm shrink-0">
          P
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-aa-text-primary text-sm">
              Perplexity Sonar
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-1.5 py-0.5 border bg-aa-neutral-100 text-aa-text-secondary border-aa-border">
              Paid
            </span>
          </span>
          <span className="block text-[12px] text-aa-text-secondary mt-0.5">
            Company research only — never scoring, drafting, or interview prep
          </span>
        </span>
        <span
          className={`flex items-center gap-1.5 text-[11px] font-semibold shrink-0 ${
            isConnected ? "text-aa-success-strong" : "text-aa-text-secondary"
          }`}>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-aa-success" : "bg-aa-neutral-400"
            }`}
          />
          {isConnected ? "Connected" : "Not connected"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-aa-text-secondary shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-aa-border p-aa-5 space-y-5">
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
            <label htmlFor="perplexity-api-key" className={LABEL_CLASS}>
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
              className={INPUT_CLASS}
            />
            <p className={HINT_CLASS}>
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
              className={OUTLINE_BUTTON_CLASS}>
              {testStatus.type === "loading" ? "Testing…" : "Test connection"}
            </button>
            {testStatus.type === "success" && (
              <span className="text-[12px] font-semibold text-aa-success-strong">
                {testStatus.message}
              </span>
            )}
            {testStatus.type === "error" && (
              <span className="text-[12px] font-semibold text-aa-error-strong">
                {testStatus.message}
              </span>
            )}
          </div>

          <p className={HINT_CLASS}>
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
      )}
    </div>
  )
}

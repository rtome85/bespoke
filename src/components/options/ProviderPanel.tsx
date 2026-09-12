import { ChevronDown } from "lucide-react"

import { ProviderConfigurationFields } from "~components/options/ProviderConfigurationFields"
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
  isOpen: boolean
  isConnected: boolean
  test: ProviderTestResult | undefined
  onToggle: () => void
  onUpdate: (patch: Partial<ProviderConfig>) => void
  onTest: () => void
  onRefreshModels: () => void
}

export function ProviderPanel({
  id,
  config,
  models,
  isOpen,
  isConnected,
  test,
  onToggle,
  onUpdate,
  onTest,
  onRefreshModels
}: Props) {
  const meta = PROVIDER_META[id]

  return (
    <div className="bg-aa-surface border border-aa-border rounded-aa-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-4 p-aa-5 text-left hover:bg-aa-neutral-50 transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-aa-md bg-aa-primary-soft text-aa-primary font-bold text-sm shrink-0">
          {meta.name[0]}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-aa-text-primary text-sm">
              {meta.name}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider rounded-aa-sm px-1.5 py-0.5 border ${
                meta.local
                  ? "bg-aa-success-soft text-aa-success-strong border-aa-success-strong"
                  : "bg-aa-neutral-100 text-aa-text-secondary border-aa-border"
              }`}>
              {meta.local ? "Free" : "Paid"}
            </span>
          </span>
          <span className="block text-[12px] text-aa-text-secondary mt-0.5">
            {meta.local
              ? "Local or Ollama Cloud — no per-token cost"
              : `Usage-based API · ${models.length} models`}
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
        <ProviderConfigurationFields
          id={id}
          config={config}
          models={models}
          test={test}
          onUpdate={onUpdate}
          onTest={onTest}
          onRefreshModels={onRefreshModels}
        />
      )}
    </div>
  )
}

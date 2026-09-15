import { Lock } from "lucide-react"

import { ProviderDetailModal } from "~components/options/ProviderDetailModal"
import { ProviderRosterRow } from "~components/options/ProviderRosterRow"
import { providerRoster } from "~lib/options/providerStatus"
import type {
  LLMProviderId,
  PerplexityConfig,
  ProviderConfig,
  ProvidersConfig
} from "~types/config"
import type { OperationStatus, ProviderTestState } from "~types/options"

interface Props {
  providers: ProvidersConfig
  perplexityConfig: PerplexityConfig
  openProvider: string | null
  providerTest: ProviderTestState
  perplexityTestStatus: OperationStatus
  onOpenProvider: (provider: string | null) => void
  onUpdateProvider: (
    provider: LLMProviderId,
    patch: Partial<ProviderConfig>
  ) => void
  onTestProvider: (provider: LLMProviderId) => void
  onRefreshProviderModels: (provider: LLMProviderId) => void
  onChangePerplexity: (config: PerplexityConfig) => void
  onTestPerplexity: () => void
  onOpenPrompts: () => void
}

export function ProvidersSettingsScreen({
  providers,
  perplexityConfig,
  openProvider,
  providerTest,
  perplexityTestStatus,
  onOpenProvider,
  onUpdateProvider,
  onTestProvider,
  onRefreshProviderModels,
  onChangePerplexity,
  onTestPerplexity,
  onOpenPrompts
}: Props) {
  const roster = providerRoster(
    providers,
    perplexityConfig,
    providerTest,
    perplexityTestStatus
  )
  const open = roster.find((entry) => entry.id === openProvider)

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-aa-lg border border-aa-border bg-aa-surface">
        <div className="aa-roster-grid bg-aa-neutral-50 px-5 py-2.5">
          <span className="aa-table-heading">Provider</span>
          <span className="aa-table-heading">Access</span>
          <span className="aa-table-heading">Status</span>
          <span />
        </div>

        {roster.map((entry) => (
          <ProviderRosterRow
            key={entry.id}
            entry={entry}
            isOpen={entry.id === openProvider}
            onOpen={() => onOpenProvider(entry.id)}
          />
        ))}
      </div>

      <p className="text-aa-caption text-aa-text-secondary flex items-start gap-2">
        <Lock className="w-aa-px-15 h-aa-px-15 shrink-0 mt-px" />
        Keys are stored locally in this browser and sent only to the provider
        you enable — never to Bespoke.
      </p>

      {open && (
        <ProviderDetailModal
          key={open.id}
          entry={open}
          providers={providers}
          perplexityConfig={perplexityConfig}
          providerTest={providerTest}
          perplexityTestStatus={perplexityTestStatus}
          onUpdateProvider={onUpdateProvider}
          onTestProvider={onTestProvider}
          onRefreshProviderModels={onRefreshProviderModels}
          onChangePerplexity={onChangePerplexity}
          onTestPerplexity={onTestPerplexity}
          onOpenPrompts={onOpenPrompts}
          onClose={() => onOpenProvider(null)}
        />
      )}
    </div>
  )
}

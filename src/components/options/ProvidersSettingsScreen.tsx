import { PerplexityProviderPanel } from "~components/options/PerplexityProviderPanel"
import { ProviderPanel } from "~components/options/ProviderPanel"
import { PROVIDER_IDS } from "~constants/options"
import { connectedProviders, providerModels } from "~lib/options/modelRouting"
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
  const connected = connectedProviders(providers)

  return (
    <div className="space-y-6">
      {PROVIDER_IDS.map((provider) => {
        const isOpen = openProvider === provider
        return (
          <ProviderPanel
            key={provider}
            id={provider}
            config={providers[provider]}
            models={providerModels(provider, providers)}
            isOpen={isOpen}
            isConnected={connected.includes(provider)}
            test={providerTest[provider]}
            onToggle={() => onOpenProvider(isOpen ? null : provider)}
            onUpdate={(patch) => onUpdateProvider(provider, patch)}
            onTest={() => onTestProvider(provider)}
            onRefreshModels={() => onRefreshProviderModels(provider)}
          />
        )
      })}

      <PerplexityProviderPanel
        config={perplexityConfig}
        isOpen={openProvider === "perplexity"}
        testStatus={perplexityTestStatus}
        onToggle={() =>
          onOpenProvider(openProvider === "perplexity" ? null : "perplexity")
        }
        onChange={onChangePerplexity}
        onTest={onTestPerplexity}
        onOpenPrompts={onOpenPrompts}
      />

      <p className="text-[12px] text-aa-text-secondary flex items-start gap-2">
        <span className="text-aa-primary mt-px">•</span>
        Keys are stored locally in this browser and sent only to the provider
        you enable — never to Bespoke.
      </p>
    </div>
  )
}

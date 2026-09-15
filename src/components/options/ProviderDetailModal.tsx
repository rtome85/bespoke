import { Server, X } from "lucide-react"
import { useId, useRef } from "react"
import { createPortal } from "react-dom"

import { PerplexityConfigurationFields } from "~components/options/PerplexityConfigurationFields"
import { ProviderConfigurationFields } from "~components/options/ProviderConfigurationFields"
import { useModalFocusTrap } from "~hooks/useModalFocusTrap"
import { providerModels } from "~lib/options/modelRouting"
import type { ProviderRosterEntry } from "~lib/options/providerStatus"
import type {
  LLMProviderId,
  PerplexityConfig,
  ProviderConfig,
  ProvidersConfig
} from "~types/config"
import type { OperationStatus, ProviderTestState } from "~types/options"

interface Props {
  entry: ProviderRosterEntry
  providers: ProvidersConfig
  perplexityConfig: PerplexityConfig
  providerTest: ProviderTestState
  perplexityTestStatus: OperationStatus
  onUpdateProvider: (
    provider: LLMProviderId,
    patch: Partial<ProviderConfig>
  ) => void
  onTestProvider: (provider: LLMProviderId) => void
  onRefreshProviderModels: (provider: LLMProviderId) => void
  onCancelPendingWork: () => void
  onChangePerplexity: (config: PerplexityConfig) => void
  onTestPerplexity: () => void
  onOpenPrompts: () => void
  onClose: () => void
}

/**
 * One account's settings, over the roster. Edits apply live (so "Test
 * connection" always exercises what is on screen); Cancel puts back the
 * config as it stood when the dialog opened, including anything a test or a
 * model refresh wrote while it was open, and abandons any still in flight.
 *
 * Portalled to <body> — the settings area is a translated, overflow-hidden
 * panel that would otherwise clip a fixed overlay to its own box.
 */
export function ProviderDetailModal({
  entry,
  providers,
  perplexityConfig,
  providerTest,
  perplexityTestStatus,
  onUpdateProvider,
  onTestProvider,
  onRefreshProviderModels,
  onCancelPendingWork,
  onChangePerplexity,
  onTestPerplexity,
  onOpenPrompts,
  onClose
}: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isPerplexity = entry.id === "perplexity"

  // Snapshot for Cancel. Mount-only: re-reading would capture the edits we
  // are meant to be able to throw away.
  const snapshot = useRef({
    provider: isPerplexity ? undefined : providers[entry.id as LLMProviderId],
    perplexity: perplexityConfig
  })

  const revert = () => {
    // Drop anything still in flight first: a test or refresh started against
    // the draft would otherwise complete after the restore below and write
    // its verdict onto the config we are putting back.
    onCancelPendingWork()
    if (isPerplexity) {
      onChangePerplexity(snapshot.current.perplexity)
    } else {
      const before = snapshot.current.provider
      // Spread every optional field explicitly: updateProvider merges a
      // patch, so an omitted key would leave a value the snapshot lacked.
      onUpdateProvider(entry.id as LLMProviderId, {
        apiKey: before?.apiKey ?? "",
        enabled: before?.enabled ?? true,
        baseUrl: before?.baseUrl,
        models: before?.models,
        lastTested: before?.lastTested
      })
    }
    onClose()
  }

  useModalFocusTrap(panelRef, revert, closeRef)

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-aa-4 font-aa"
      onClick={revert}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-aa-vh-90 w-full max-w-aa-px-640 flex-col overflow-hidden rounded-aa-xl bg-aa-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center gap-aa-3 border-b border-aa-border px-aa-px-22 py-4">
          <span className="grid h-aa-px-34 w-aa-px-34 shrink-0 place-items-center rounded-aa-md bg-aa-neutral-100">
            {entry.local ? (
              <Server className="h-aa-px-18 w-aa-px-18 text-aa-neutral-700" />
            ) : (
              <span className="text-aa-caption font-bold text-aa-neutral-700">
                {entry.monogram}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-aa-2">
              <h2
                id={titleId}
                className="text-aa-body font-semibold text-aa-text-primary">
                {entry.name}
              </h2>
              <span
                className={
                  entry.status.tone === "ok"
                    ? "aa-status-chip aa-status-ok"
                    : entry.status.tone === "warn"
                      ? "aa-status-chip aa-status-warn"
                      : entry.status.tone === "bad"
                        ? "aa-status-chip aa-status-bad"
                        : "aa-status-chip aa-status-idle"
                }>
                <span className="aa-status-dot" />
                {entry.status.label}
              </span>
            </span>
            <span className="block text-aa-11 text-aa-text-secondary">
              {entry.blurb}
            </span>
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={revert}
            aria-label={`Close ${entry.name} settings`}
            className="aa-toolbar-btn shrink-0">
            <X className="h-aa-px-18 w-aa-px-18" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isPerplexity ? (
            <PerplexityConfigurationFields
              config={perplexityConfig}
              testStatus={perplexityTestStatus}
              onChange={onChangePerplexity}
              onTest={onTestPerplexity}
              onOpenPrompts={onOpenPrompts}
            />
          ) : (
            <ProviderConfigurationFields
              id={entry.id as LLMProviderId}
              config={providers[entry.id as LLMProviderId]}
              models={providerModels(entry.id as LLMProviderId, providers)}
              test={providerTest[entry.id as LLMProviderId]}
              onUpdate={(patch) =>
                onUpdateProvider(entry.id as LLMProviderId, patch)
              }
              onTest={() => onTestProvider(entry.id as LLMProviderId)}
              onRefreshModels={() =>
                onRefreshProviderModels(entry.id as LLMProviderId)
              }
            />
          )}
        </div>

        <footer className="flex items-center justify-end gap-aa-3 border-t border-aa-border bg-aa-neutral-50 px-aa-px-22 py-3.5">
          <button type="button" onClick={revert} className="aa-btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onClose} className="aa-btn-accent">
            Save provider
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

import { Route } from "lucide-react"

import { ModelRouteSelect } from "~components/options/ModelRouteSelect"
import { INPUT_CLASS } from "~constants/options"
import { fmtCost, runCost } from "~lib/options/modelRouting"
import type {
  LLMProviderId,
  ProvidersConfig,
  RoutableJob,
  RouteTarget
} from "~types/config"

interface ModelRouteRowProps {
  label: string
  description: string
  job: RoutableJob
  target: RouteTarget
  connectedProviders: LLMProviderId[]
  providers: ProvidersConfig
  disabled: boolean
  onChange: (value: string) => void
}

export function ModelRouteRow({
  label,
  description,
  job,
  target,
  connectedProviders,
  providers,
  disabled,
  onChange
}: ModelRouteRowProps) {
  const cost = runCost(target.model, job)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr,minmax(0,320px)] gap-3 sm:items-start py-4 border-b border-aa-border last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-aa-text-primary">{label}</p>
        <p className="text-[12px] text-aa-text-secondary mt-0.5">
          {description}
        </p>
      </div>
      <div className="space-y-1.5">
        <ModelRouteSelect
          target={target}
          connectedProviders={connectedProviders}
          providers={providers}
          disabled={disabled}
          ariaLabel={`${label} model`}
          onChange={onChange}
        />
        <p className="text-[11px] text-aa-text-secondary">
          {disabled
            ? "Connect a provider to route this job."
            : cost == null
              ? "No per-token cost on this model."
              : `≈ ${fmtCost(cost)} per run`}
        </p>
      </div>
    </div>
  )
}

interface LockedModelRouteRowProps {
  label: string
  description: string
}

export function LockedModelRouteRow({
  label,
  description
}: LockedModelRouteRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr,minmax(0,320px)] gap-3 sm:items-start py-4 border-b border-aa-border last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-aa-text-primary">{label}</p>
        <p className="text-[12px] text-aa-text-secondary mt-0.5">
          {description}
        </p>
      </div>
      <div className="space-y-1.5">
        <div
          className={`${INPUT_CLASS} flex items-center gap-2 text-aa-text-secondary bg-aa-neutral-50`}>
          <Route className="w-3.5 h-3.5 shrink-0" />
          Perplexity Sonar
        </div>
        <p className="text-[11px] text-aa-text-secondary">
          Fixed — configure it on the Providers page.
        </p>
      </div>
    </div>
  )
}

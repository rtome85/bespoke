import { GenerationParametersCard } from "~components/options/GenerationParametersCard"
import { ModelRouteRow } from "~components/options/ModelRouteRow"
import { ModelRouteSelect } from "~components/options/ModelRouteSelect"
import { ResearchRouteRow } from "~components/options/ResearchRouteRow"
import { connectedProviders, decodeRoute } from "~lib/options/modelRouting"
import type {
  LLMTuningConfig,
  ModelRouting,
  PerplexityConfig,
  ProvidersConfig,
  ResearchPreference,
  RoutableJob,
  SearchConfig
} from "~types/config"

interface Props {
  providers: ProvidersConfig
  modelRouting: ModelRouting
  tuning: LLMTuningConfig
  perplexityConfig: PerplexityConfig
  searchConfig: SearchConfig
  onChangeModelRouting: (routing: ModelRouting) => void
  onChangeTuning: (tuning: LLMTuningConfig) => void
  onOpenProviders: () => void
}

export function ModelRoutingSettingsScreen({
  providers,
  modelRouting,
  tuning,
  perplexityConfig,
  searchConfig,
  onChangeModelRouting,
  onChangeTuning,
  onOpenProviders
}: Props) {
  const connected = connectedProviders(providers)
  const noProviders = connected.length === 0

  const setRoute = (job: RoutableJob | "fallback", value: string) => {
    const target = decodeRoute(value)
    onChangeModelRouting(
      job === "fallback"
        ? { ...modelRouting, fallback: { ...modelRouting.fallback, target } }
        : { ...modelRouting, [job]: target }
    )
  }

  return (
    <div className="space-y-6">
      {noProviders && (
        <div className="aa-message-info">
          No AI provider is connected yet. Add one on the{" "}
          <button
            type="button"
            onClick={onOpenProviders}
            className="font-semibold underline bg-transparent border-0 p-0 cursor-pointer text-aa-neutral-700">
            Providers
          </button>{" "}
          page to route scoring, drafting and prep.
        </div>
      )}

      <div className="aa-card">
        <h2 className="aa-section-heading">Assignments</h2>
        <p className="text-sm text-aa-text-secondary -mt-1">
          Which model runs each job.
        </p>
        <hr className="aa-divider" />
        <div>
          <ModelRouteRow
            label="Match scoring"
            description="Scores your profile against the job and writes the gap analysis."
            job="scoring"
            target={modelRouting.scoring}
            connectedProviders={connected}
            providers={providers}
            disabled={noProviders}
            onChange={(value) => setRoute("scoring", value)}
          />
          <ModelRouteRow
            label="Document drafting"
            description="Writes the tailored CV and cover letter."
            job="drafting"
            target={modelRouting.drafting}
            connectedProviders={connected}
            providers={providers}
            disabled={noProviders}
            onChange={(value) => setRoute("drafting", value)}
          />
          <ModelRouteRow
            label="Interview prep"
            description="Writes the per-round prep sheet (Interviews → Prep), and summarises company research gathered from the web."
            job="prep"
            target={modelRouting.prep ?? modelRouting.drafting}
            connectedProviders={connected}
            providers={providers}
            disabled={noProviders}
            onChange={(value) => setRoute("prep", value)}
          />
          <ResearchRouteRow
            value={modelRouting.research ?? "auto"}
            perplexityConfig={perplexityConfig}
            searchConfig={searchConfig}
            onChange={(research: ResearchPreference) =>
              onChangeModelRouting({ ...modelRouting, research })
            }
          />
        </div>
      </div>

      <div className="aa-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="aa-section-heading">Fallback</h2>
            <p className="text-sm text-aa-text-secondary -mt-1">
              Retry on a second model when the primary one errors or times out.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={modelRouting.fallback.enabled}
              onChange={(event) =>
                onChangeModelRouting({
                  ...modelRouting,
                  fallback: {
                    ...modelRouting.fallback,
                    enabled: event.target.checked
                  }
                })
              }
              className="w-4 h-4 accent-aa-primary"
            />
            <span className="text-aa-caption font-semibold text-aa-text-secondary">
              {modelRouting.fallback.enabled ? "On" : "Off"}
            </span>
          </label>
        </div>
        {modelRouting.fallback.enabled && (
          <>
            <hr className="aa-divider" />
            <label htmlFor="fallback-model" className="aa-label">
              Fallback model
            </label>
            <ModelRouteSelect
              id="fallback-model"
              ariaLabel="Fallback model"
              target={modelRouting.fallback.target}
              connectedProviders={connected}
              providers={providers}
              disabled={noProviders}
              onChange={(value) => setRoute("fallback", value)}
            />
          </>
        )}
      </div>

      <GenerationParametersCard tuning={tuning} onChange={onChangeTuning} />
    </div>
  )
}

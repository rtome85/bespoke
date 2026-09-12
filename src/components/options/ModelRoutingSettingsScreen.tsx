import { GenerationParametersCard } from "~components/options/GenerationParametersCard"
import {
  LockedModelRouteRow,
  ModelRouteRow
} from "~components/options/ModelRouteRow"
import { ModelRouteSelect } from "~components/options/ModelRouteSelect"
import {
  CARD_CLASS,
  DIVIDER_CLASS,
  INFO_MESSAGE_CLASS,
  LABEL_CLASS,
  SECTION_HEADING_CLASS
} from "~constants/options"
import { connectedProviders, decodeRoute } from "~lib/options/modelRouting"
import type {
  LLMTuningConfig,
  ModelRouting,
  ProvidersConfig,
  RoutableJob
} from "~types/config"

interface Props {
  providers: ProvidersConfig
  modelRouting: ModelRouting
  tuning: LLMTuningConfig
  onChangeModelRouting: (routing: ModelRouting) => void
  onChangeTuning: (tuning: LLMTuningConfig) => void
  onOpenProviders: () => void
}

export function ModelRoutingSettingsScreen({
  providers,
  modelRouting,
  tuning,
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
    <div className="space-y-6 max-w-3xl">
      {noProviders && (
        <div className={INFO_MESSAGE_CLASS}>
          No AI provider is connected yet. Add one on the{" "}
          <button
            type="button"
            onClick={onOpenProviders}
            className="font-semibold underline bg-transparent border-0 p-0 cursor-pointer text-aa-neutral-700">
            Providers
          </button>{" "}
          page to route scoring and drafting.
        </div>
      )}

      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Assignments</h2>
        <p className="text-sm text-aa-text-secondary -mt-1">
          Which model runs each job.
        </p>
        <hr className={DIVIDER_CLASS} />
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
            description="Writes the tailored CV and cover letter, and the per-round interview prep (Interviews → Prep)."
            job="drafting"
            target={modelRouting.drafting}
            connectedProviders={connected}
            providers={providers}
            disabled={noProviders}
            onChange={(value) => setRoute("drafting", value)}
          />
          <LockedModelRouteRow
            label="Company research"
            description="Pulls the company facts shown in the report and the Prep workspace."
          />
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={SECTION_HEADING_CLASS}>Fallback</h2>
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
            <span className="text-[12px] font-semibold text-aa-text-secondary">
              {modelRouting.fallback.enabled ? "On" : "Off"}
            </span>
          </label>
        </div>
        {modelRouting.fallback.enabled && (
          <>
            <hr className={DIVIDER_CLASS} />
            <label htmlFor="fallback-model" className={LABEL_CLASS}>
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

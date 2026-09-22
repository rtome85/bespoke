import {
  RESEARCH_PREFERENCE_LABELS,
  RESEARCH_PREFERENCES,
  SEARCH_ENGINE_META
} from "~constants/research"
import type {
  PerplexityConfig,
  ResearchPreference,
  SearchConfig
} from "~types/config"

interface Props {
  value: ResearchPreference
  perplexityConfig: PerplexityConfig
  searchConfig: SearchConfig
  onChange: (value: ResearchPreference) => void
}

/**
 * Which source answers company research.
 *
 * Not a `ModelRouteRow`: research picks a *source* (a search account, the
 * employer's own site, the model's memory), and only the summarising step
 * runs on the Interview prep model. Options stay selectable even when the
 * account behind them isn't connected — the label says so, so choosing one is
 * a way to find out what it needs rather than a dead end.
 */
export function ResearchRouteRow({
  value,
  perplexityConfig,
  searchConfig,
  onChange
}: Props) {
  const ready: Record<ResearchPreference, boolean> = {
    auto: true,
    perplexity: !!perplexityConfig.enabled && !!perplexityConfig.apiKey,
    search: !!searchConfig.enabled && !!searchConfig.apiKey.trim(),
    // Both need nothing configured: the site is read with a per-domain
    // permission the Prep workspace asks for, and model knowledge is just the
    // prep model answering without sources.
    site: true,
    model: true
  }

  const label = (preference: ResearchPreference) => {
    const base =
      preference === "search"
        ? `${SEARCH_ENGINE_META[searchConfig.engine].name} only`
        : RESEARCH_PREFERENCE_LABELS[preference]
    return ready[preference] ? base : `${base} (not connected)`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr,minmax(0,320px)] gap-3 sm:items-start py-4 border-b border-aa-border last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-aa-text-primary">
          Company research
        </p>
        <p className="text-aa-caption text-aa-text-secondary mt-0.5">
          Where the company facts in the match report and the Prep workspace
          come from. The Interview prep model writes the summary.
        </p>
      </div>
      <div className="space-y-1.5">
        <select
          id="research-source"
          aria-label="Company research source"
          value={value}
          onChange={(event) =>
            onChange(event.target.value as ResearchPreference)
          }
          className="aa-input">
          {RESEARCH_PREFERENCES.map((preference) => (
            <option key={preference} value={preference}>
              {label(preference)}
            </option>
          ))}
        </select>
        <p className="text-aa-11 text-aa-text-secondary">
          {value === "auto"
            ? "Tries Perplexity, then web search, then the company's own site, then the model's own knowledge."
            : ready[value]
              ? "Research fails rather than falling back to another source."
              : "Connect this on the Providers page, or research will fail."}
        </p>
      </div>
    </div>
  )
}

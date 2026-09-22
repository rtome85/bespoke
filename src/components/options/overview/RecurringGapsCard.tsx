import { settingsRoute } from "~constants/routes"
import { recurringGaps } from "~lib/overview/gaps"
import type { SavedApplication } from "~types/userProfile"

import { OverviewCard } from "./primitives"

/**
 * The weaknesses each match report lists are read once, inside one
 * application, and then forgotten. Counted across every report, the ones that
 * keep coming back are a to-do list for the profile.
 */
export function RecurringGapsCard({
  apps,
  onNavigate
}: {
  apps: SavedApplication[]
  onNavigate: (hash: string) => void
}) {
  const gaps = recurringGaps(apps)

  if (gaps.length === 0) {
    return (
      <OverviewCard
        title="Recurring gaps"
        sub="What match reports keep saying you are missing.">
        <p className="text-aa-caption text-aa-text-secondary">
          Nothing has come up twice yet. Once a gap appears in more than one
          match report it shows up here.
        </p>
      </OverviewCard>
    )
  }

  const max = Math.max(...gaps.map((g) => g.count))

  return (
    <OverviewCard
      title="Recurring gaps"
      sub="Terms that came up in more than one match report, counted once per application.">
      <div className="space-y-3">
        {gaps.map((gap) => (
          <div key={gap.label} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-aa-caption font-semibold text-aa-text-primary">
                {gap.label}
              </span>
              <span
                className="mt-1 block h-1.5 rounded-aa-pill bg-aa-primary"
                style={{ width: `${Math.max((gap.count / max) * 100, 8)}%` }}
              />
              <span className="mt-1 block truncate text-aa-10 text-aa-text-secondary">
                {gap.example}
              </span>
            </span>
            <span className="shrink-0 text-aa-caption font-bold tabular-nums text-aa-text-secondary">
              {gap.count}×
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate(settingsRoute("skills"))}
          className="aa-btn-outline">
          Update skills
        </button>
        <span className="text-aa-11 text-aa-text-secondary">
          Counted from wording in the match reports, not inferred.
        </span>
      </div>
    </OverviewCard>
  )
}

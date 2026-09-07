import { INTERVIEWS_SCHEMA_VERSION, STORAGE_KEYS } from "~storage/keys"
import type {
  ApplicationStatus,
  InterviewRound,
  RoundType,
  SavedApplication
} from "~types/userProfile"

// Legacy 8-value `ApplicationStatus` → collapsed 5-value model.
const LEGACY_STATUS_MAP: Record<string, ApplicationStatus> = {
  "HR Interview": "Interviewing",
  "1st Technical Interview": "Interviewing",
  "2nd Technical Interview": "Interviewing",
  "Final Interview": "Interviewing"
}

const LEGACY_STATUS_TO_ROUND_TYPE: Record<string, RoundType> = {
  "HR Interview": "HR",
  "1st Technical Interview": "Technical",
  "2nd Technical Interview": "Technical",
  "Final Interview": "Final"
}

function isoToDay(iso: unknown): string | undefined {
  if (typeof iso !== "string") return undefined
  const day = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/**
 * One record's migration. Pure and idempotent: a record with no legacy status
 * and no `preparationPlan`/`isFavorite` is returned untouched (same reference is
 * fine — callers replace the whole array).
 *
 * Storage is untrusted at runtime — a bad import or a hand-edit can leave a
 * null / non-object entry or a non-string `status`/`createdAt`. Anything
 * unexpected is passed straight through rather than throwing (which would abort
 * the whole `apps.map` and brick the migration).
 */
export function migrateApplication(app: SavedApplication): SavedApplication {
  if (!app || typeof app !== "object") return app

  const isLegacyInterview =
    typeof app.status === "string" && app.status in LEGACY_STATUS_MAP
  const hasDeadFields =
    app.preparationPlan !== undefined || app.isFavorite !== undefined

  if (!isLegacyInterview && !hasDeadFields) return app

  const next: SavedApplication = { ...app }

  if (isLegacyInterview) {
    const legacyStatus = app.status as string
    next.status = LEGACY_STATUS_MAP[legacyStatus]

    // Synthesize one past round so the stage isn't lost. Guarded on a missing
    // or empty `rounds` array so a concurrent re-run (options page + service
    // worker on first load) that sees the first write can't double up.
    if (!Array.isArray(next.rounds) || next.rounds.length === 0) {
      const round: InterviewRound = {
        id: `rnd_${crypto.randomUUID()}`,
        type: LEGACY_STATUS_TO_ROUND_TYPE[legacyStatus],
        date: isoToDay(app.statusUpdatedAt) ?? isoToDay(app.createdAt),
        synthesized: true,
        createdAt: new Date().toISOString()
      }
      if (app.preparationPlan?.content) {
        round.prep = {
          notes: app.preparationPlan.content,
          topicsPointsAt: app.preparationPlan.generatedAt
        }
      }
      next.rounds = [round]
    }
  }

  delete next.preparationPlan
  delete next.isFavorite
  return next
}

/**
 * One-time, version-guarded migration to the collapsed status model + embedded
 * interview rounds. Safe to call from multiple contexts (options page mount and
 * the background service worker) — the version check short-circuits after the
 * first successful run.
 */
export async function migrateInterviewsSchema(): Promise<void> {
  const versionRes = await chrome.storage.local.get(
    STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION
  )
  if (
    versionRes[STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION] ===
    INTERVIEWS_SCHEMA_VERSION
  ) {
    return
  }

  const appsRes = await chrome.storage.local.get(
    STORAGE_KEYS.SAVED_APPLICATIONS
  )
  const apps: SavedApplication[] = Array.isArray(
    appsRes[STORAGE_KEYS.SAVED_APPLICATIONS]
  )
    ? appsRes[STORAGE_KEYS.SAVED_APPLICATIONS]
    : []

  // Isolate each record: one malformed entry that still slips past the guards
  // in `migrateApplication` must not abort the batch — valid records still get
  // written back.
  const migrated = apps.map((app) => {
    try {
      return migrateApplication(app)
    } catch (err) {
      console.warn("[interviews migration] leaving malformed record as-is", err)
      return app
    }
  })

  await chrome.storage.local.set({
    [STORAGE_KEYS.SAVED_APPLICATIONS]: migrated,
    [STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION]: INTERVIEWS_SCHEMA_VERSION
  })
}

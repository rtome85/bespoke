import { INTERVIEWS_SCHEMA_VERSION, STORAGE_KEYS } from "~storage/keys"
import { mutateSavedApplications } from "~storage/savedApplications"
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

/**
 * Fields dropped from `SavedApplication` that can still be present in stored
 * records written by an older build. Declared locally so the migration keeps
 * reading them without the public type carrying dead shape.
 */
interface LegacyApplicationFields {
  preparationPlan?: { content?: string; generatedAt?: string }
  isFavorite?: boolean
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

  const legacy = app as SavedApplication & LegacyApplicationFields

  const isLegacyInterview =
    typeof app.status === "string" && app.status in LEGACY_STATUS_MAP
  const hasDeadFields =
    legacy.preparationPlan !== undefined || legacy.isFavorite !== undefined

  if (!isLegacyInterview && !hasDeadFields) return app

  const next: SavedApplication & LegacyApplicationFields = { ...legacy }

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
      if (legacy.preparationPlan?.content) {
        round.prep = {
          notes: legacy.preparationPlan.content,
          topicsPointsAt: legacy.preparationPlan.generatedAt
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
 * The per-record pass over the stored array, plus the version stamp.
 *
 * The array commit goes through `mutateSavedApplications`, which re-reads the
 * freshest list immediately before writing and serializes with every other
 * write in this context — so a concurrent user edit landing in the migration's
 * read→write window is merged, not clobbered. `migrateApplication` is
 * idempotent, so a cross-context race (two startup contexts migrating at once)
 * just re-applies the same deterministic transform to the newest array; the
 * only non-determinism is a synthesized round's random id / timestamp. A
 * heavier cross-context lock is deliberately avoided for a one-time idempotent
 * transform (stale-lock failure mode not worth it).
 */
async function runMigrationPass(): Promise<void> {
  await mutateSavedApplications((current) =>
    // Isolate each record: one malformed entry that still slips past the guards
    // in `migrateApplication` must not abort the batch.
    current.map((app) => {
      try {
        return migrateApplication(app)
      } catch (err) {
        console.warn(
          "[interviews migration] leaving malformed record as-is",
          err
        )
        return app
      }
    })
  )

  // Separate write — atomicity with the array isn't required: if the process
  // dies here the next run just re-migrates (idempotent no-op) and sets this.
  await chrome.storage.local.set({
    [STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION]: INTERVIEWS_SCHEMA_VERSION
  })
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
  // `>=`, not `===`: if a newer build already migrated to a later schema (and
  // this older build is now running via a downgrade or a sync skew), do
  // nothing rather than run a stale migration over newer-shaped data.
  // `undefined` / non-numeric junk yields `false` here and gets migrated,
  // which is the safe direction (the per-record pass is hardened + idempotent).
  if (
    versionRes[STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION] >=
    INTERVIEWS_SCHEMA_VERSION
  ) {
    return
  }

  await runMigrationPass()
}

/**
 * Migration for a bulk restore that replaced `savedApplications` wholesale from
 * outside this install (Drive `pull`, JSON import).
 *
 * The local `interviewsSchemaVersion` describes the array that was just
 * *overwritten*, so it says nothing about what landed — a pre-migration backup
 * restored onto an install already stamped current would be skipped forever by
 * the normal guard, leaving a legacy status the collapsed 5-value UI can't
 * render. Decide from the version the payload carried instead:
 *
 * - absent / non-numeric → a backup written before the version was included in
 *   the payload, i.e. exactly the pre-migration shape: migrate it.
 * - at or ahead of `INTERVIEWS_SCHEMA_VERSION` → already migrated, or written
 *   by a newer build. Adopt that version and run nothing, so this build never
 *   applies a stale transform to newer-shaped data. This is the same downgrade
 *   protection `migrateInterviewsSchema`'s `>=` gives, sourced from the payload
 *   rather than from the clobbered local stamp.
 */
export async function migrateRestoredApplications(
  sourceVersion: unknown
): Promise<void> {
  if (
    typeof sourceVersion === "number" &&
    sourceVersion >= INTERVIEWS_SCHEMA_VERSION
  ) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION]: sourceVersion
    })
    return
  }

  await runMigrationPass()
}

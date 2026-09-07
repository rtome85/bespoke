import type {
  ApplicationStatus,
  Debrief,
  DebriefOutcome,
  InterviewRound,
  RoundPrep,
  RoundType,
  SavedApplication
} from "~types/userProfile"

import { STORAGE_KEYS } from "./keys"

const KEY = STORAGE_KEYS.SAVED_APPLICATIONS

type Mutator = (
  current: SavedApplication[]
) => SavedApplication[] | Promise<SavedApplication[]>

// Serialized read-modify-write cycle for the tracked-application list.
//
// Every caller (the app shell's ApplicationsSection and the standalone
// dialog page) mutates `savedApplications` through this writer instead of
// running `chrome.storage.local.set` on an array derived from a React state
// snapshot. Two problems that caused: rapid successive edits in one context
// wrote back the pre-edit array, and the app shell + dialog popup being open
// at once let each clobber the other's changes.
//
// Each mutation re-reads the latest stored array immediately before writing,
// and the queue below chains the RMW cycles so they can't interleave within
// this context.
let queue: Promise<unknown> = Promise.resolve()

export function mutateSavedApplications(
  mutate: Mutator
): Promise<SavedApplication[]> {
  const run = async (): Promise<SavedApplication[]> => {
    const res = await chrome.storage.local.get(KEY)
    const current: SavedApplication[] = Array.isArray(res[KEY]) ? res[KEY] : []
    const next = await mutate(current)
    await chrome.storage.local.set({ [KEY]: next })
    return next
  }

  // Chain on settle (not just resolve) so one rejected mutation doesn't wedge
  // the queue for every later caller.
  const result = queue.then(run, run)
  queue = result.catch(() => undefined)
  return result
}

// ── Interview round helpers ──────────────────────────────────────────────────
//
// All go through `mutateSavedApplications` so they're serialized with every
// other write to the list. Status side-effects (promote on add, outcome on
// debrief) live here so callers can't forget them.

const mapApp = (
  apps: SavedApplication[],
  appId: string,
  fn: (a: SavedApplication) => SavedApplication
) => apps.map((a) => (a.id === appId ? fn(a) : a))

const mapRound = (
  a: SavedApplication,
  roundId: string,
  fn: (r: InterviewRound) => InterviewRound
): SavedApplication => ({
  ...a,
  rounds: (a.rounds ?? []).map((r) => (r.id === roundId ? fn(r) : r))
})

/** Outcomes that move the application to a terminal status. */
const OUTCOME_STATUS: Partial<Record<DebriefOutcome, ApplicationStatus>> = {
  offer: "Offer",
  reject: "Reject"
}

/**
 * Append a new round. Promotes `Saved`/`Applied` → `Interviewing` (never
 * downgrades). Returns the created round (for navigation).
 */
export async function addRound(
  appId: string,
  partial: Omit<Partial<InterviewRound>, "id" | "createdAt"> & { type: RoundType }
): Promise<InterviewRound> {
  const round: InterviewRound = {
    id: `rnd_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...partial
  }
  await mutateSavedApplications((apps) =>
    mapApp(apps, appId, (a) => {
      const next: SavedApplication = {
        ...a,
        rounds: [...(a.rounds ?? []), round]
      }
      if (a.status === "Saved" || a.status === "Applied") {
        next.status = "Interviewing"
        next.statusUpdatedAt = new Date().toISOString()
      }
      return next
    })
  )
  return round
}

export function updateRound(
  appId: string,
  roundId: string,
  patch: Partial<Omit<InterviewRound, "id" | "createdAt">>
): Promise<SavedApplication[]> {
  return mutateSavedApplications((apps) =>
    mapApp(apps, appId, (a) => mapRound(a, roundId, (r) => ({ ...r, ...patch })))
  )
}

export function deleteRound(
  appId: string,
  roundId: string
): Promise<SavedApplication[]> {
  return mutateSavedApplications((apps) =>
    mapApp(apps, appId, (a) => ({
      ...a,
      rounds: (a.rounds ?? []).filter((r) => r.id !== roundId)
    }))
  )
}

export function setRoundPrep(
  appId: string,
  roundId: string,
  patch: Partial<RoundPrep>
): Promise<SavedApplication[]> {
  return mutateSavedApplications((apps) =>
    mapApp(apps, appId, (a) =>
      mapRound(a, roundId, (r) => ({ ...r, prep: { ...r.prep, ...patch } }))
    )
  )
}

/**
 * Merge a debrief patch and re-apply the outcome → status rule:
 * `offer`/`reject` set the terminal status; `advance`/`waiting` move the app
 * back to `Interviewing` (so correcting a mistaken `reject` works).
 */
export function setRoundDebrief(
  appId: string,
  roundId: string,
  patch: Partial<Debrief>
): Promise<SavedApplication[]> {
  const now = new Date().toISOString()
  return mutateSavedApplications((apps) =>
    mapApp(apps, appId, (a) => {
      const next = mapRound(a, roundId, (r) => ({
        ...r,
        debrief: {
          ...r.debrief,
          ...patch,
          loggedAt: r.debrief?.loggedAt ?? now,
          updatedAt: now
        }
      }))

      const target: ApplicationStatus | undefined =
        patch.outcome === "advance" || patch.outcome === "waiting"
          ? "Interviewing"
          : patch.outcome
            ? OUTCOME_STATUS[patch.outcome]
            : undefined

      if (target && next.status !== target) {
        next.status = target
        next.statusUpdatedAt = now
      }
      return next
    })
  )
}

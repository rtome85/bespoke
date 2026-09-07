import { clearRoundAlarms, syncRoundAlarms } from "~lib/interviews/reminders"
import {
  hasOpenRound,
  isPristineRound,
  openRound
} from "~lib/interviews/selectors"
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

export class OpenRoundError extends Error {
  constructor() {
    super(
      "This application already has an open interview round. Debrief it before adding another."
    )
    this.name = "OpenRoundError"
  }
}

/**
 * Append a new round. Enforces one open round per application, promotes
 * `Saved`/`Applied` → `Interviewing` (never downgrades), and returns the
 * created round (for navigation). Throws `OpenRoundError` if a round is
 * already open.
 */
export async function addRound(
  appId: string,
  partial: Omit<Partial<InterviewRound>, "id" | "createdAt"> & {
    type: RoundType
  }
): Promise<InterviewRound> {
  const round: InterviewRound = {
    id: `rnd_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...partial
  }
  await mutateSavedApplications((apps) => {
    const app = apps.find((a) => a.id === appId)
    if (app && hasOpenRound(app)) throw new OpenRoundError()
    return mapApp(apps, appId, (a) => {
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
  })
  await syncRoundAlarms(round)
  return round
}

/**
 * Change an application's status and keep its round list consistent:
 *
 * - entering `Interviewing` with no open round → auto-create a first HR stub;
 * - any other (non round-creating) status → drop a still-pristine open round,
 *   so an accidental `Interviewing` that's rolled back leaves nothing behind.
 *
 * Idempotent: the round reconciliation runs from the resulting status even
 * when the status itself didn't change, so callers that write the status
 * elsewhere (e.g. the side panel form) can still call this for the side effect.
 */
export function setApplicationStatus(
  appId: string,
  status: ApplicationStatus
): Promise<SavedApplication[]> {
  const now = new Date().toISOString()
  return mutateSavedApplications((apps) =>
    mapApp(apps, appId, (a) => {
      let next: SavedApplication =
        a.status === status ? a : { ...a, status, statusUpdatedAt: now }

      if (status === "Interviewing") {
        if (!hasOpenRound(next)) {
          next = {
            ...next,
            rounds: [
              ...(next.rounds ?? []),
              { id: `rnd_${crypto.randomUUID()}`, type: "HR", createdAt: now }
            ]
          }
        }
      } else {
        const open = openRound(next)
        if (open && isPristineRound(open)) {
          next = {
            ...next,
            rounds: (next.rounds ?? []).filter((r) => r.id !== open.id)
          }
        }
      }

      return next
    })
  )
}

export async function updateRound(
  appId: string,
  roundId: string,
  patch: Partial<Omit<InterviewRound, "id" | "createdAt">>
): Promise<SavedApplication[]> {
  let updated: InterviewRound | undefined
  const apps = await mutateSavedApplications((current) =>
    mapApp(current, appId, (a) =>
      mapRound(a, roundId, (r) => {
        updated = { ...r, ...patch }
        return updated
      })
    )
  )
  if (updated) await syncRoundAlarms(updated)
  return apps
}

export async function deleteRound(
  appId: string,
  roundId: string
): Promise<SavedApplication[]> {
  const apps = await mutateSavedApplications((current) =>
    mapApp(current, appId, (a) => ({
      ...a,
      rounds: (a.rounds ?? []).filter((r) => r.id !== roundId)
    }))
  )
  await clearRoundAlarms(roundId)
  return apps
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

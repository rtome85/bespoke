import {
  needsDebrief,
  nextRound,
  openRound,
  prepReady,
  roundsWithApp,
  type RoundRef
} from "~lib/interviews/selectors"
import { appliedDay, daysSince, lastMoveDay } from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

/**
 * The work still owed by the user, derived from the same application list the
 * charts read. Everything here is actionable — if an item cannot be clicked
 * through to somewhere that resolves it, it does not belong in this file.
 */

/** Applied this long ago with no answer → worth a nudge. */
export const QUIET_DAYS = 14

/** Saved this long ago without applying or dropping → worth a decision. */
export const UNDECIDED_DAYS = 7

export interface FollowUpRef {
  app: SavedApplication
  round: RoundRef["round"]
  text: string
}

export interface NeedsYou {
  /** Soonest scheduled round, with whether its prep has been generated. */
  nextRound?: RoundRef
  nextRoundPrepReady: boolean
  /** Past rounds with nothing logged. */
  debriefsOwed: RoundRef[]
  /** Unticked follow-ups promised in a debrief — surfaced nowhere else today. */
  openFollowUps: FollowUpRef[]
  /** Applied, still silent, past `QUIET_DAYS`. */
  goneQuiet: SavedApplication[]
  /** Saved but never applied or dropped, past `UNDECIDED_DAYS`. */
  undecidedSaves: SavedApplication[]
  /** Marked as interviewing with no round scheduled — a hole in the data. */
  interviewingWithoutRound: SavedApplication[]
  /** Total actionable items, excluding the next round itself. */
  total: number
}

export function needsYou(
  apps: SavedApplication[],
  now: Date = new Date()
): NeedsYou {
  const refs = roundsWithApp(apps)
  const next = nextRound(refs, now)
  const debriefsOwed = needsDebrief(refs, now)

  const openFollowUps: FollowUpRef[] = []
  for (const { app, round } of refs) {
    for (const item of round.debrief?.followUps ?? []) {
      const text = item.text?.trim()
      if (!item.done && text) openFollowUps.push({ app, round, text })
    }
  }

  const goneQuiet = apps.filter((app) => {
    if (app.status !== "Applied") return false
    const waiting = daysSince(appliedDay(app), now)
    return waiting !== null && waiting >= QUIET_DAYS
  })

  const undecidedSaves = apps.filter((app) => {
    if (app.status !== "Saved") return false
    const sitting = daysSince(lastMoveDay(app), now)
    return sitting !== null && sitting >= UNDECIDED_DAYS
  })

  const interviewingWithoutRound = apps.filter(
    (app) => app.status === "Interviewing" && !openRound(app)?.date
  )

  return {
    nextRound: next,
    nextRoundPrepReady: next ? prepReady(next.round) : false,
    debriefsOwed,
    openFollowUps,
    goneQuiet,
    undecidedSaves,
    interviewingWithoutRound,
    total:
      debriefsOwed.length +
      openFollowUps.length +
      goneQuiet.length +
      undecidedSaves.length +
      interviewingWithoutRound.length
  }
}

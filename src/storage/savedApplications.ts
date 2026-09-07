import type { SavedApplication } from "~types/userProfile"

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

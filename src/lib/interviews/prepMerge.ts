import type {
  GapDefense,
  PrepItem,
  StarStory,
  TechExercise,
  TechQuestion
} from "~types/userProfile"

/**
 * Merging a regenerated section into the one on screen.
 *
 * The rule the confirm dialog promises: **anything you touched survives
 * verbatim.** A ticked or pinned item is evidence the user worked on it, so it
 * is kept as-is and marked `userAdded` — the same protection a hand-typed item
 * gets. Only untouched model-written items are replaced.
 *
 * The previous implementation carried ticks across by exact text match, which
 * meant a regeneration silently dropped them: two runs of a model practically
 * never reproduce a line byte-for-byte, so every "kept" item failed to match
 * and was discarded along with its pin.
 */

const key = (s: string) => s.trim().toLowerCase()

/**
 * Did the user act on this entry?
 *
 * A generated lesson counts. It is not a tick, but it is the one thing on the
 * sheet the user spent a model call of their own on — losing it to a
 * regeneration would mean paying for it twice.
 */
const touched = (item: {
  checked?: boolean
  pinned?: boolean
  lesson?: unknown
}) => !!item.checked || !!item.pinned || !!item.lesson

/**
 * Generic merge: keep everything the user added or touched, then append the
 * fresh items, skipping any the kept set already covers.
 */
function merge<T>(
  prev: T[],
  next: T[],
  identity: (item: T) => string,
  promote: (item: T) => T
): T[] {
  const kept = prev.filter(
    (p) =>
      (p as { userAdded?: boolean }).userAdded ||
      touched(p as { checked?: boolean; pinned?: boolean })
  )
  const kids = kept.map(promote)
  const seen = new Set(kids.map((k) => key(identity(k))))
  const fresh = next.filter((n) => !seen.has(key(identity(n))))
  return [...kids, ...fresh]
}

export function mergePrepItems(
  prev: PrepItem[] = [],
  nextTexts: string[] = []
): PrepItem[] {
  return merge<PrepItem>(
    prev,
    nextTexts.map((text) => ({ text })),
    (i) => i.text,
    // A kept item is no longer disposable, so it carries the same flag as one
    // the user typed — that is what stops the *next* regeneration dropping it.
    (i) => (i.userAdded ? i : { ...i, userAdded: true })
  )
}

export function mergeGapDefenses(
  prev: GapDefense[] = [],
  next: GapDefense[] = []
): GapDefense[] {
  return merge<GapDefense>(
    prev,
    next,
    (d) => d.gap,
    (d) => (d.userAdded ? d : { ...d, userAdded: true })
  )
}

export function mergeStarStories(
  prev: StarStory[] = [],
  next: StarStory[] = []
): StarStory[] {
  return merge<StarStory>(
    prev,
    next,
    (s) => s.title,
    (s) => (s.userAdded ? s : { ...s, userAdded: true })
  )
}

export function mergeTechQuestions(
  prev: TechQuestion[] = [],
  next: TechQuestion[] = []
): TechQuestion[] {
  return merge<TechQuestion>(
    prev,
    next,
    (q) => q.question,
    (q) => (q.userAdded ? q : { ...q, userAdded: true })
  )
}

export function mergeTechExercises(
  prev: TechExercise[] = [],
  next: TechExercise[] = []
): TechExercise[] {
  return merge<TechExercise>(
    prev,
    next,
    (e) => e.title,
    (e) => (e.userAdded ? e : { ...e, userAdded: true })
  )
}

/**
 * Which entry in a section is the one the panel was opened at?
 *
 * Position first, text second. The index is right whenever nothing has moved,
 * and it is the only thing that can separate two entries that read the same —
 * nothing dedupes the model's output, so a sheet can carry two exercises under
 * one title, and a bare text search would resolve both to whichever came
 * first. The text is what confirms the slot still holds the same entry: a
 * regeneration can reorder the list while a lesson is being written, and an
 * index followed blindly would land on a different exercise entirely.
 *
 * Returns -1 when neither resolves, which callers read as "this entry is gone".
 */
export function locateItem<T>(
  list: T[],
  index: number,
  text: (item: T) => string,
  wanted: string
): number {
  const here = list[index]
  if (here && text(here) === wanted) return index
  return list.findIndex((item) => text(item) === wanted)
}

/** Does this section hold anything the user would lose to a regeneration? */
export function hasKeptWork(
  ...sections: (
    | { checked?: boolean; pinned?: boolean; lesson?: unknown }[]
    | undefined
  )[]
): boolean {
  return sections.some((list) => (list ?? []).some(touched))
}

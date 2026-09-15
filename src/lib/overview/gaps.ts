import type { SavedApplication } from "~types/userProfile"

/**
 * Recurring gaps across match reports.
 *
 * `matchWeaknesses` / `matchImprovements` are free-text sentences written by
 * the model, one set per application, and today they are read once inside a
 * single application and never seen again. Grouping them by exact text would
 * never match — no two sentences come back identical — so this counts the
 * *terms* that keep reappearing instead, and reports how many separate
 * applications raised each one.
 *
 * Deliberately a frequency heuristic, not a model call: it runs on every
 * render, costs nothing, and cannot invent a gap that was never written down.
 */

export interface GapTheme {
  /** Display term, e.g. "Kubernetes" or "team leadership". */
  label: string
  /** Number of distinct applications that mentioned it. */
  count: number
  /** Shortest sentence it appeared in, as supporting evidence. */
  example: string
}

/** Words that carry no signal in a "what you're missing" sentence. */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "can",
  "candidate",
  "could",
  "demonstrate",
  "demonstrated",
  "description",
  "does",
  "each",
  "evidence",
  "experience",
  "explicit",
  "explicitly",
  "for",
  "from",
  "has",
  "have",
  "how",
  "however",
  "in",
  "is",
  "it",
  "its",
  "job",
  "lack",
  "lacks",
  "level",
  "like",
  "listed",
  "little",
  "may",
  "mention",
  "mentioned",
  "more",
  "most",
  "much",
  "must",
  "no",
  "not",
  "of",
  "on",
  "or",
  "other",
  "position",
  "posting",
  "profile",
  "required",
  "requires",
  "requirement",
  "requirements",
  "resume",
  "role",
  "seems",
  "shown",
  "some",
  "specific",
  "strong",
  "than",
  "that",
  "the",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "up",
  "use",
  "used",
  "using",
  "was",
  "were",
  "what",
  "when",
  "which",
  "while",
  "who",
  "will",
  "with",
  "within",
  "without",
  "work",
  "working",
  "would",
  "year",
  "years",
  "you",
  "your",
  "yours"
])

const MIN_TERM_LENGTH = 3

/** Split a sentence into lowercase word tokens, keeping in-word + - . / */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]+/g, " ")
    .split(/[\s/]+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((t) => t.length >= MIN_TERM_LENGTH && !STOPWORDS.has(t))
}

/** Unigrams plus adjacent pairs, so "team leadership" can outrank "team". */
function termsOf(text: string): string[] {
  const tokens = tokenize(text)
  const terms = [...tokens]
  for (let i = 0; i < tokens.length - 1; i++) {
    terms.push(`${tokens[i]} ${tokens[i + 1]}`)
  }
  return terms
}

const titleCase = (term: string) =>
  term.replace(/(^|[\s-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())

/**
 * Rank the terms that show up across the most applications.
 *
 * A term is counted once per application, so ten complaints inside one match
 * report cannot outweigh the same gap raised by ten different employers.
 */
export function recurringGaps(apps: SavedApplication[], limit = 5): GapTheme[] {
  const appCount = new Map<string, number>()
  const examples = new Map<string, string>()

  for (const app of apps) {
    const sentences = [
      ...(app.matchWeaknesses ?? []),
      ...(app.matchImprovements ?? [])
    ]
      .map((s) => s.trim())
      .filter(Boolean)
    if (sentences.length === 0) continue

    const seen = new Set<string>()
    for (const sentence of sentences) {
      for (const term of termsOf(sentence)) {
        const previous = examples.get(term)
        if (previous === undefined || sentence.length < previous.length) {
          examples.set(term, sentence)
        }
        if (seen.has(term)) continue
        seen.add(term)
        appCount.set(term, (appCount.get(term) ?? 0) + 1)
      }
    }
  }

  const ranked = [...appCount.entries()]
    .filter(([, count]) => count > 1)
    // Count first, then phrases over single words: a two-word term that ties
    // with its own parts is the more useful label ("team leadership" > "team").
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        b[0].split(" ").length - a[0].split(" ").length ||
        a[0].localeCompare(b[0])
    )

  // Prefer the phrase over its parts: once "team leadership" is in, drop
  // "team" and "leadership" unless they are meaningfully more common.
  const chosen: { term: string; count: number }[] = []
  for (const [term, count] of ranked) {
    const words = term.split(" ")
    const redundant = chosen.some(({ term: kept, count: keptCount }) => {
      const keptWords = kept.split(" ")
      const overlaps =
        keptWords.some((w) => words.includes(w)) ||
        words.some((w) => keptWords.includes(w))
      return overlaps && count <= keptCount
    })
    if (redundant) continue
    chosen.push({ term, count })
    if (chosen.length === limit) break
  }

  return chosen.map(({ term, count }) => ({
    label: titleCase(term),
    count,
    example: examples.get(term) ?? ""
  }))
}

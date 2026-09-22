import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  InterviewRound,
  SavedApplication,
  TechExercise
} from "~types/userProfile"

import {
  companyInfoToMarkdown,
  readCompanyResearch,
  researchCacheKey,
  researchIsStale,
  writeCompanyResearch
} from "./companyResearch"
import { prepCheatSheet } from "./prepCheatSheet"
import {
  hasKeptWork,
  locateItem,
  mergeGapDefenses,
  mergePrepItems,
  mergeStarStories,
  mergeTechExercises,
  mergeTechQuestions
} from "./prepMerge"

const storageGet = vi.fn()
const storageSet = vi.fn()

function application(
  overrides: Partial<SavedApplication> = {}
): SavedApplication {
  return {
    id: "app-1",
    company: "Acme",
    jobTitle: "Engineer",
    status: "Interviewing",
    date: "2026-09-01",
    createdAt: "2026-09-01T09:00:00.000Z",
    ...overrides
  }
}

beforeEach(() => {
  storageGet.mockReset()
  storageSet.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: storageGet,
        set: storageSet
      }
    }
  })
})

describe("prep section merging", () => {
  it("keeps user-added, checked, and pinned items while replacing untouched items", () => {
    expect(
      mergePrepItems(
        [
          { text: "Typed", userAdded: true },
          { text: "Checked", checked: true },
          { text: "Pinned", pinned: true },
          { text: "Disposable" }
        ],
        ["Fresh", " checked "]
      )
    ).toEqual([
      { text: "Typed", userAdded: true },
      { text: "Checked", checked: true, userAdded: true },
      { text: "Pinned", pinned: true, userAdded: true },
      { text: "Fresh" }
    ])
  })

  it("preserves lessons as user work during technical regeneration", () => {
    const previous: TechExercise[] = [
      {
        title: "Queue exercise",
        prompt: "Build one",
        lesson: {
          markdown: "Lesson",
          generatedAt: "2026-09-22T10:00:00.000Z"
        }
      }
    ]

    expect(
      mergeTechExercises(previous, [
        { title: "Tree exercise", prompt: "Build a tree" }
      ])
    ).toEqual([
      { ...previous[0], userAdded: true },
      { title: "Tree exercise", prompt: "Build a tree" }
    ])
  })

  it("applies the same identity rules to every structured prep section", () => {
    expect(
      mergeGapDefenses(
        [{ gap: "Kubernetes", response: "Learned it", pinned: true }],
        [{ gap: " kubernetes ", response: "New response" }]
      )
    ).toHaveLength(1)
    expect(
      mergeStarStories(
        [
          {
            title: "Launch",
            situation: "S",
            task: "T",
            action: "A",
            result: "R",
            checked: true
          }
        ],
        [
          {
            title: "launch",
            situation: "new",
            task: "new",
            action: "new",
            result: "new"
          }
        ]
      )
    ).toHaveLength(1)
    expect(
      mergeTechQuestions(
        [{ question: "What is a queue?", answer: "FIFO", pinned: true }],
        [{ question: "what is a queue?", answer: "new" }]
      )
    ).toHaveLength(1)
  })

  it("locates the original duplicate by position before falling back to text", () => {
    const list = [{ text: "same" }, { text: "same" }, { text: "other" }]
    expect(locateItem(list, 1, (item) => item.text, "same")).toBe(1)
    expect(locateItem(list, 2, (item) => item.text, "same")).toBe(0)
    expect(locateItem(list, 0, (item) => item.text, "missing")).toBe(-1)
  })

  it("recognizes checks, pins, and generated lessons as kept work", () => {
    expect(hasKeptWork(undefined, [{ checked: true }])).toBe(true)
    expect(hasKeptWork([{ pinned: true }])).toBe(true)
    expect(hasKeptWork([{ lesson: { markdown: "lesson" } }])).toBe(true)
    expect(hasKeptWork([], [{ checked: false }])).toBe(false)
  })
})

describe("prepCheatSheet", () => {
  it("renders populated behavioral sections and omits empty ones", () => {
    const round: InterviewRound = {
      id: "rnd-1",
      type: "HR",
      date: "2026-09-25",
      time: "10:30",
      createdAt: "2026-09-01T09:00:00.000Z",
      prep: {
        logistics: "  Video conversation with HR.  ",
        likelyTopics: [{ text: "Motivation", checked: true, pinned: true }],
        talkingPoints: [{ text: "Platform launch" }],
        questionsToAsk: [{ text: "How is success measured?" }],
        gapDefenses: [{ gap: "Rust", response: "Learning through a project" }],
        starStories: [
          {
            title: "Launch",
            situation: "Legacy system",
            task: "Replace it",
            action: "Led migration",
            result: "Fewer incidents"
          }
        ],
        notes: "  Remember names.  "
      }
    }

    const markdown = prepCheatSheet(application(), round)

    expect(markdown).toContain("# Acme — HR Interview")
    expect(markdown).toContain("2026-09-25 · 10:30 · Engineer")
    expect(markdown).toContain("- [x] ★ Motivation")
    expect(markdown).toContain("**Action** — Led migration")
    expect(markdown).toContain("## My notes\n\nRemember names.")
    expect(markdown).not.toContain("## Exercises to work through")
  })

  it("renders technical exercises and question drills", () => {
    const round: InterviewRound = {
      id: "rnd-2",
      type: "Technical",
      createdAt: "2026-09-01T09:00:00.000Z",
      prep: {
        likelyTopics: [{ text: "TypeScript" }],
        techExercises: [
          {
            title: "Build a queue",
            topic: "Data structures",
            prompt: "Implement enqueue and dequeue.",
            approach: "Explain complexity",
            checked: true
          }
        ],
        techQuestions: [
          {
            question: "What is covariance?",
            topic: "TypeScript",
            answer: "A relationship between subtype transformations."
          }
        ]
      }
    }

    const markdown = prepCheatSheet(application(), round)

    expect(markdown).toContain("## Stack to review")
    expect(markdown).toContain("### [x] Build a queue — Data structures")
    expect(markdown).toContain("**A strong answer shows** — Explain complexity")
    expect(markdown).toContain("**What is covariance?** _(TypeScript)_")
  })
})

describe("company research helpers", () => {
  it("normalizes cache keys and detects only valid stale timestamps", () => {
    const now = Date.parse("2026-09-22T12:00:00.000Z")
    expect(researchCacheKey("  ACME Corp  ")).toBe("acme corp")
    expect(researchIsStale(undefined, now)).toBe(false)
    expect(researchIsStale("invalid", now)).toBe(false)
    expect(researchIsStale("2026-09-22T11:00:00.000Z", now)).toBe(false)
    expect(researchIsStale("2026-08-01T00:00:00.000Z", now)).toBe(true)
  })

  it("reads and writes isolated per-company storage entries", async () => {
    const entry = {
      text: "Research",
      generatedAt: "2026-09-22T12:00:00.000Z"
    }
    storageGet.mockResolvedValue({
      "companyResearchCache:acme": entry
    })

    await expect(readCompanyResearch(" ACME ")).resolves.toEqual(entry)
    await writeCompanyResearch(" ACME ", entry)

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      "companyResearchCache:acme"
    )
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      "companyResearchCache:acme": entry
    })
  })

  it("renders available fields while dropping placeholders and blanks", () => {
    expect(
      companyInfoToMarkdown({
        industry: " Software ",
        size: "Not available",
        description: " Builds tools. ",
        notableProjects: [" Platform ", ""],
        ratings: { glassdoor: 4.2, indeed: 0 },
        sources: []
      })
    ).toBe(
      "**Industry** — Software\n\nBuilds tools.\n\n**Notable projects**\n- Platform\n\n**Ratings** — Glassdoor 4.2 · Indeed 0"
    )
  })

  it("returns empty markdown when research has nothing usable", () => {
    expect(
      companyInfoToMarkdown({
        industry: "Not available",
        size: " ",
        description: "not AVAILABLE",
        notableProjects: [],
        ratings: {},
        sources: []
      })
    ).toBe("")
  })
})

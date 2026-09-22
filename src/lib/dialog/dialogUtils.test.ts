import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SavedApplication } from "~types/userProfile"

import {
  duplicateApplicationDetail,
  duplicateApplicationTitle,
  findDuplicateApplication,
  findStoredDuplicateApplication,
  normalizeApplicationField
} from "./duplicateApplications"
import { getScorePresentation } from "./scorePresentation"

const storageGet = vi.fn()

function application(
  overrides: Partial<SavedApplication> = {}
): SavedApplication {
  return {
    id: "app-1",
    company: "Acme, Inc.",
    jobTitle: "Platform Engineer",
    status: "Saved",
    date: "2026-09-01",
    createdAt: "2026-09-01T09:00:00.000Z",
    ...overrides
  }
}

beforeEach(() => {
  storageGet.mockReset()
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: storageGet
      }
    }
  })
})

describe("duplicate application matching", () => {
  it("normalizes Latin accents, punctuation, whitespace, and case", () => {
    expect(normalizeApplicationField("  ÁCME—Portugal, Lda. ")).toBe(
      "acme portugal lda"
    )
  })

  it("preserves letters from non-Latin scripts", () => {
    expect(normalizeApplicationField("株式会社アクメ")).toBe("株式会社アクメ")
    expect(normalizeApplicationField("株式会社ベータ")).not.toBe(
      normalizeApplicationField("株式会社アクメ")
    )
  })

  it("returns the most recently touched matching application", () => {
    const older = application({ id: "older" })
    const newer = application({
      id: "newer",
      company: "acme inc",
      jobTitle: "PLATFORM-engineer",
      statusUpdatedAt: "2026-09-20T12:00:00.000Z"
    })

    expect(
      findDuplicateApplication(
        [older, application({ id: "other", company: "Beta" }), newer],
        "Ácme Inc.",
        "Platform Engineer"
      )
    ).toBe(newer)
  })

  it("does not match incomplete company or title keys", () => {
    expect(findDuplicateApplication([application()], "", "Engineer")).toBe(null)
    expect(findDuplicateApplication([application()], "Acme", "---")).toBe(null)
  })

  it("reads the current stored application list", async () => {
    storageGet.mockResolvedValue({
      savedApplications: [application({ id: "stored" })]
    })

    await expect(
      findStoredDuplicateApplication("Acme Inc", "Platform Engineer")
    ).resolves.toMatchObject({ id: "stored" })
  })

  it("treats malformed stored data as an empty list", async () => {
    storageGet.mockResolvedValue({
      savedApplications: "not-an-array"
    })

    await expect(
      findStoredDuplicateApplication("Acme", "Engineer")
    ).resolves.toBeNull()
  })
})

describe("duplicate application copy", () => {
  it.each([
    ["Saved", "You already saved this job opening."],
    ["Applied", "You already applied to this job opening."],
    ["Interviewing", "You're already interviewing for this job opening."],
    ["Offer", "You already have an offer for this job opening."],
    ["Reject", "You already applied to this job opening and were rejected."]
  ] as const)("describes the %s status", (status, expected) => {
    expect(duplicateApplicationTitle(application({ status }))).toBe(expected)
  })

  it("formats the tracked date as a local calendar date", () => {
    expect(duplicateApplicationDetail(application())).toBe(
      "Platform Engineer at Acme, Inc. — tracked since Sep 1, 2026."
    )
  })
})

describe("score presentation", () => {
  it.each([
    [100, "Strong match", "var(--aa-success)"],
    [75, "Strong match", "var(--aa-success)"],
    [74.9, "Moderate match", "var(--aa-warning)"],
    [50, "Moderate match", "var(--aa-warning)"],
    [49.9, "Weak match", "var(--aa-error)"],
    [-1, "Weak match", "var(--aa-error)"]
  ])("maps %s to %s", (score, band, fill) => {
    expect(getScorePresentation(score)).toMatchObject({ band, fill })
  })
})

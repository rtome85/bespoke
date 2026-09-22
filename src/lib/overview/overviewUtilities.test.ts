import { describe, expect, it } from "vitest"

import type { SavedApplication } from "~types/userProfile"

import { applicationsToCsv, roundsToCsv } from "./exportCsv"
import { recurringGaps } from "./gaps"
import { needsYou } from "./needsYou"

const NOW = new Date(2026, 8, 22, 12, 0, 0)

function application(
  overrides: Partial<SavedApplication> = {}
): SavedApplication {
  return {
    id: crypto.randomUUID(),
    company: "Acme",
    jobTitle: "Engineer",
    status: "Applied",
    date: "2026-09-01",
    createdAt: "2026-09-01T09:00:00.000Z",
    ...overrides
  }
}

describe("CSV exports", () => {
  it("quotes application fields and derives pipeline metrics", () => {
    const csv = applicationsToCsv([
      application({
        company: 'Acme, "International"',
        jobTitle: "Senior Engineer",
        status: "Interviewing",
        statusUpdatedAt: "2026-09-20T09:00:00.000Z",
        firstReplyAt: "2026-09-10T09:00:00.000Z",
        matchPercentage: 88,
        jobUrl: "https://www.example.com/jobs/123",
        tags: ["remote", "priority"],
        rounds: [
          {
            id: "rnd-1",
            type: "HR",
            date: "2026-09-15",
            createdAt: "2026-09-02T09:00:00.000Z",
            debrief: {
              loggedAt: "2026-09-15T12:00:00.000Z",
              rating: 4
            }
          },
          {
            id: "rnd-2",
            type: "Technical",
            date: "2026-09-20",
            createdAt: "2026-09-16T09:00:00.000Z",
            debrief: {
              loggedAt: "2026-09-20T12:00:00.000Z",
              rating: 5
            }
          }
        ]
      })
    ])
    const [header, row] = csv.split("\r\n")

    expect(header).toContain('"avg_debrief_rating"')
    expect(row).toContain('"Acme, ""International"""')
    expect(row).toContain('"4.5"')
    expect(row).toContain('"example.com"')
    expect(row).toContain('"remote | priority"')
    expect(row).toContain('"yes"')
  })

  it("exports custom rounds, preparation, outcomes, and open follow-ups", () => {
    const csv = roundsToCsv([
      application({
        rounds: [
          {
            id: "rnd-1",
            type: "Custom",
            customLabel: "Founder chat",
            date: "2026-09-25",
            time: "14:30",
            format: "video",
            createdAt: "2026-09-01T09:00:00.000Z",
            prep: { notes: "Ready" },
            debrief: {
              loggedAt: "2026-09-25T16:00:00.000Z",
              rating: 5,
              outcome: "advance",
              followUps: [
                { text: "Send portfolio" },
                { text: "Thank recruiter", done: true }
              ]
            }
          }
        ]
      })
    ])
    const [, row] = csv.split("\r\n")

    expect(row).toContain('"Founder chat"')
    expect(row).toContain('"video"')
    expect(row).toContain('"yes","yes","5","advance","1"')
  })

  it("returns a header-only round export for an empty pipeline", () => {
    expect(roundsToCsv([])).not.toContain("\r\n")
  })
})

describe("recurringGaps", () => {
  it("counts a theme once per application and prefers useful phrases", () => {
    const apps = [
      application({
        matchWeaknesses: [
          "Needs stronger team leadership experience.",
          "Team leadership is not explicit."
        ]
      }),
      application({
        matchImprovements: ["Add evidence of team leadership in delivery."]
      }),
      application({ matchWeaknesses: ["More Kubernetes depth is required."] })
    ]

    expect(recurringGaps(apps)).toEqual([
      {
        label: "Team Leadership",
        count: 2,
        example: "Team leadership is not explicit."
      }
    ])
  })

  it("preserves accented words in multilingual gap themes", () => {
    const apps = [
      application({ matchWeaknesses: ["Falta liderança técnica comprovada."] }),
      application({
        matchImprovements: ["Destacar liderança técnica em projetos."]
      })
    ]

    expect(recurringGaps(apps, 1)).toEqual([
      {
        label: "Liderança Técnica",
        count: 2,
        example: "Falta liderança técnica comprovada."
      }
    ])
  })

  it("uses the shortest supporting sentence and respects the limit", () => {
    const apps = [
      application({ matchWeaknesses: ["Kubernetes knowledge is missing."] }),
      application({ matchWeaknesses: ["Kubernetes gap."] }),
      application({ matchImprovements: ["Add Kubernetes evidence."] }),
      application({ matchWeaknesses: ["Terraform gap."] }),
      application({ matchWeaknesses: ["Terraform experience is missing."] })
    ]

    const result = recurringGaps(apps, 1)
    expect(result).toHaveLength(1)
    expect(result[0].example).toBe("Kubernetes gap.")
  })

  it("returns no themes mentioned by only one application", () => {
    expect(
      recurringGaps([
        application({ matchWeaknesses: ["Kubernetes experience"] })
      ])
    ).toEqual([])
  })
})

describe("needsYou", () => {
  it("collects every actionable category and computes the total", () => {
    const upcoming = application({
      id: "upcoming",
      status: "Interviewing",
      rounds: [
        {
          id: "next",
          type: "Technical",
          date: "2026-09-23",
          time: "09:00",
          createdAt: "2026-09-01T09:00:00.000Z"
        }
      ]
    })
    const past = application({
      id: "past",
      status: "Interviewing",
      rounds: [
        {
          id: "past-round",
          type: "HR",
          date: "2026-09-20",
          createdAt: "2026-09-01T09:00:00.000Z",
          debrief: {
            followUps: [
              { text: " Send portfolio " },
              { text: "Already sent", done: true },
              { text: "   " }
            ]
          }
        }
      ]
    })
    const quiet = application({ id: "quiet", date: "2026-09-01" })
    const undecided = application({
      id: "undecided",
      status: "Saved",
      date: "2026-09-01",
      statusUpdatedAt: "2026-09-10T09:00:00.000Z"
    })
    const missingRound = application({
      id: "missing-round",
      status: "Interviewing",
      rounds: []
    })

    const result = needsYou(
      [upcoming, past, quiet, undecided, missingRound],
      NOW
    )

    expect(result.nextRound?.round.id).toBe("next")
    expect(result.nextRoundPrepReady).toBe(false)
    expect(result.debriefsOwed.map((ref) => ref.round.id)).toEqual([
      "past-round"
    ])
    expect(result.openFollowUps).toEqual([
      expect.objectContaining({ app: past, text: "Send portfolio" })
    ])
    expect(result.goneQuiet).toEqual([quiet])
    expect(result.undecidedSaves).toEqual([undecided])
    expect(result.interviewingWithoutRound).toEqual([missingRound])
    expect(result.total).toBe(5)
  })

  it("marks the next round ready when generated prep has useful content", () => {
    const app = application({
      status: "Interviewing",
      rounds: [
        {
          id: "next",
          type: "HR",
          date: "2026-09-23",
          createdAt: "2026-09-01T09:00:00.000Z",
          prep: { talkingPoints: [{ text: "Introduction" }] }
        }
      ]
    })

    expect(needsYou([app], NOW).nextRoundPrepReady).toBe(true)
  })

  it("returns an empty actionable state for an empty pipeline", () => {
    expect(needsYou([], NOW)).toEqual({
      nextRound: undefined,
      nextRoundPrepReady: false,
      debriefsOwed: [],
      openFollowUps: [],
      goneQuiet: [],
      undecidedSaves: [],
      interviewingWithoutRound: [],
      total: 0
    })
  })
})

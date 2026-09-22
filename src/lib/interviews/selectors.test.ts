import { describe, expect, it } from "vitest"

import type { SavedApplication } from "~types/userProfile"

import {
  groupByDay,
  needsDebrief,
  needsPrep,
  relativeDayLabel,
  roundsWithApp
} from "./selectors"

const NOW = new Date(2026, 8, 22, 12, 0, 0)

function application(overrides: Partial<SavedApplication>): SavedApplication {
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

describe("interview selectors", () => {
  it("uses local calendar days for relative labels", () => {
    expect(relativeDayLabel("2026-09-21", NOW)).toBe("yesterday")
    expect(relativeDayLabel("2026-09-22", NOW)).toBe("today")
    expect(relativeDayLabel("2026-09-23", NOW)).toBe("tomorrow")
  })

  it("keeps unprepared upcoming and unscheduled rounds in the prep queue", () => {
    const apps = [
      application({
        rounds: [
          {
            id: "prepared",
            type: "HR",
            date: "2026-09-23",
            time: "09:00",
            createdAt: "2026-09-01T09:00:00.000Z",
            prep: { talkingPoints: [{ text: "Introduce yourself" }] }
          },
          {
            id: "upcoming",
            type: "Technical",
            date: "2026-09-24",
            time: "10:00",
            createdAt: "2026-09-01T09:00:00.000Z"
          },
          {
            id: "unscheduled",
            type: "Final",
            createdAt: "2026-09-01T09:00:00.000Z"
          }
        ]
      })
    ]

    expect(
      needsPrep(roundsWithApp(apps), NOW).map((ref) => ref.round.id)
    ).toEqual(["upcoming", "unscheduled"])
  })

  it("only lists completed real rounds that still need a debrief", () => {
    const apps = [
      application({
        rounds: [
          {
            id: "needs-debrief",
            type: "HR",
            date: "2026-09-21",
            createdAt: "2026-09-01T09:00:00.000Z"
          },
          {
            id: "already-debriefed",
            type: "Technical",
            date: "2026-09-20",
            createdAt: "2026-09-01T09:00:00.000Z",
            debrief: { loggedAt: "2026-09-20T13:00:00.000Z" }
          },
          {
            id: "legacy-round",
            type: "HR",
            date: "2026-09-19",
            createdAt: "2026-09-01T09:00:00.000Z",
            synthesized: true
          }
        ]
      })
    ]

    expect(
      needsDebrief(roundsWithApp(apps), NOW).map((ref) => ref.round.id)
    ).toEqual(["needs-debrief"])
  })

  it("groups scheduled rounds chronologically and labels today and tomorrow", () => {
    const apps = [
      application({
        rounds: [
          {
            id: "tomorrow",
            type: "HR",
            date: "2026-09-23",
            time: "15:00",
            createdAt: "2026-09-01T09:00:00.000Z"
          },
          {
            id: "today-later",
            type: "Technical",
            date: "2026-09-22",
            time: "14:00",
            createdAt: "2026-09-01T09:00:00.000Z"
          },
          {
            id: "today-earlier",
            type: "Final",
            date: "2026-09-22",
            time: "09:00",
            createdAt: "2026-09-01T09:00:00.000Z"
          }
        ]
      })
    ]

    expect(groupByDay(roundsWithApp(apps), NOW)).toEqual([
      {
        day: "2026-09-22",
        label: "Today",
        rounds: [
          expect.objectContaining({
            round: expect.objectContaining({ id: "today-earlier" })
          }),
          expect.objectContaining({
            round: expect.objectContaining({ id: "today-later" })
          })
        ]
      },
      {
        day: "2026-09-23",
        label: "Tomorrow",
        rounds: [
          expect.objectContaining({
            round: expect.objectContaining({ id: "tomorrow" })
          })
        ]
      }
    ])
  })
})

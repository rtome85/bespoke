import { describe, expect, it } from "vitest"

import type { SavedApplication } from "~types/userProfile"

import {
  matchBands,
  rate,
  stageCounts,
  timingStats,
  volumeDelta
} from "./metrics"

const NOW = new Date(2026, 8, 22, 12, 0, 0)

function application(overrides: Partial<SavedApplication>): SavedApplication {
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

describe("overview metrics", () => {
  it("counts pipeline stages reached by applications and their interview rounds", () => {
    const apps = [
      application({ status: "Saved" }),
      application({ status: "Applied" }),
      application({ status: "Interviewing" }),
      application({ status: "Offer" }),
      application({
        status: "Reject",
        rounds: [
          {
            id: "legacy-round",
            type: "HR",
            createdAt: "2026-09-02T09:00:00.000Z",
            synthesized: true
          }
        ]
      })
    ]

    expect(stageCounts(apps)).toEqual({
      tracked: 5,
      applied: 4,
      interviewed: 3,
      offers: 1,
      rejected: 1,
      awaiting: 1,
      replied: 3
    })
  })

  it("withholds rates until their sample is large enough", () => {
    expect(rate(2, 4)).toEqual({ value: null, hits: 2, sample: 4, needed: 5 })
    expect(rate(2, 5)).toEqual({ value: 40, hits: 2, sample: 5, needed: 5 })
  })

  it("derives reply timing from the first reply and tracks the oldest wait", () => {
    const apps = [
      application({
        status: "Interviewing",
        date: "2026-09-01",
        firstReplyAt: "2026-09-03T09:00:00.000Z",
        statusUpdatedAt: "2026-09-20T09:00:00.000Z"
      }),
      application({
        status: "Offer",
        date: "2026-09-01",
        firstReplyAt: "2026-09-05T09:00:00.000Z"
      }),
      application({
        status: "Reject",
        date: "2026-09-01",
        firstReplyAt: "2026-09-10T09:00:00.000Z"
      }),
      application({ status: "Applied", date: "2026-09-05" })
    ]

    expect(timingStats(apps, NOW)).toMatchObject({
      medianDaysToReply: 4,
      replySample: 3,
      oldestWaitingDays: 17
    })
  })

  it("compares recent application volume against the preceding 30 days", () => {
    const apps = [
      application({ date: "2026-09-22" }),
      application({ date: "2026-08-24" }),
      application({ date: "2026-08-23" }),
      application({ date: "2026-07-26" }),
      application({ status: "Saved", date: "2026-09-10" })
    ]

    expect(volumeDelta(apps, NOW)).toEqual({
      current: 2,
      previous: 2,
      delta: 0
    })
  })

  it("assigns scores at band boundaries and unlocks the band rate at three apps", () => {
    const apps = [
      application({ status: "Interviewing", matchPercentage: 85 }),
      application({ status: "Applied", matchPercentage: 90 }),
      application({ status: "Offer", matchPercentage: 100 }),
      application({ status: "Applied", matchPercentage: 75 }),
      application({ status: "Applied", matchPercentage: 65 }),
      application({ status: "Applied", matchPercentage: 64 })
    ]

    expect(matchBands(apps)).toMatchObject([
      {
        label: "85–100%",
        count: 3,
        interviewed: 2,
        interviewRate: { value: 67 }
      },
      { label: "75–84%", count: 1 },
      { label: "65–74%", count: 1 },
      { label: "Below 65%", count: 1 }
    ])
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { STORAGE_KEYS } from "~storage/keys"
import type { InterviewRound, SavedApplication } from "~types/userProfile"

import {
  clearAllReminderAlarms,
  clearRoundAlarms,
  normalizeReminderSettings,
  parseReminderAlarm,
  remindersEnabled,
  resyncAllReminderAlarms,
  syncRoundAlarms
} from "./reminders"

const NOW = new Date("2026-09-22T10:00:00.000Z")

let stored: Record<string, unknown>
let alarms: Map<string, chrome.alarms.Alarm>

function round(overrides: Partial<InterviewRound> = {}): InterviewRound {
  return {
    id: "rnd_one",
    type: "Technical",
    date: "2026-09-25",
    time: "12:00",
    createdAt: "2026-09-01T09:00:00.000Z",
    ...overrides
  }
}

function application(rounds: InterviewRound[]): SavedApplication {
  return {
    id: "app-1",
    company: "Acme",
    jobTitle: "Engineer",
    status: "Interviewing",
    date: "2026-09-01",
    createdAt: "2026-09-01T09:00:00.000Z",
    rounds
  }
}

function installChrome(
  values: Record<string, unknown> = {},
  existingAlarms: chrome.alarms.Alarm[] = []
): void {
  stored = structuredClone(values)
  alarms = new Map(existingAlarms.map((alarm) => [alarm.name, alarm]))
  const chromeFake = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({
          [key]: structuredClone(stored[key])
        }))
      }
    },
    alarms: {
      getAll: vi.fn(async () => structuredClone([...alarms.values()])),
      clear: vi.fn(async (name: string) => alarms.delete(name)),
      create: vi.fn((name: string, info: chrome.alarms.AlarmCreateInfo) => {
        alarms.set(name, { name, scheduledTime: info.when ?? 0 })
      })
    }
  }
  vi.stubGlobal("chrome", chromeFake as unknown as typeof chrome)
}

describe("interview reminders", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    installChrome()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("normalizes stored lead times in canonical order and removes invalid values", () => {
    expect(
      normalizeReminderSettings({
        leadTimes: ["1h", "invalid", "3d"],
        debriefNudge: false
      })
    ).toEqual({ leadTimes: ["3d", "1h"], debriefNudge: false })
  })

  it("falls back to default reminder settings for malformed values", () => {
    expect(normalizeReminderSettings("bad settings")).toEqual({
      leadTimes: ["24h", "1h"],
      debriefNudge: true
    })
  })

  it("parses only well-formed reminder alarm names", () => {
    expect(parseReminderAlarm("interview-reminder:rnd_one:1h")).toEqual({
      roundId: "rnd_one",
      key: "1h"
    })
    expect(parseReminderAlarm("other:rnd_one:1h")).toBeNull()
    expect(parseReminderAlarm("interview-reminder:rnd_one")).toBeNull()
  })

  it("enables reminders by default and honors an explicit false", async () => {
    expect(await remindersEnabled()).toBe(true)

    stored[STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED] = false
    expect(await remindersEnabled()).toBe(false)
  })

  it("reconciles selected future alarms and skips lead times already past", async () => {
    const start = new Date(2026, 8, 25, 12, 0, 0).getTime()
    installChrome(
      {
        [STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS]: {
          leadTimes: ["1w", "24h", "1h"],
          debriefNudge: true
        }
      },
      [
        { name: "interview-reminder:rnd_one:old", scheduledTime: 1 },
        { name: "unrelated-alarm", scheduledTime: 2 }
      ]
    )

    await syncRoundAlarms(round())

    expect([...alarms.keys()].sort()).toEqual([
      "interview-reminder:rnd_one:1h",
      "interview-reminder:rnd_one:24h",
      "interview-reminder:rnd_one:debrief",
      "unrelated-alarm"
    ])
    expect(alarms.get("interview-reminder:rnd_one:24h")?.scheduledTime).toBe(
      start - 24 * 60 * 60 * 1000
    )
    expect(
      alarms.get("interview-reminder:rnd_one:debrief")?.scheduledTime
    ).toBe(start + 3 * 60 * 60 * 1000)
  })

  it("clears a round's old alarms without recreating them when disabled", async () => {
    installChrome({ [STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED]: false }, [
      { name: "interview-reminder:rnd_one:1h", scheduledTime: 1 },
      { name: "interview-reminder:rnd_other:1h", scheduledTime: 2 }
    ])

    await syncRoundAlarms(round())

    expect([...alarms.keys()]).toEqual(["interview-reminder:rnd_other:1h"])
  })

  it("clears stale alarms for a round that is no longer scheduled", async () => {
    installChrome({}, [
      { name: "interview-reminder:rnd_one:1h", scheduledTime: 1 }
    ])

    await syncRoundAlarms(round({ date: undefined, time: undefined }))

    expect([...alarms.keys()]).toEqual([])
  })

  it("does not schedule a debrief nudge for an already debriefed round", async () => {
    installChrome({
      [STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS]: {
        leadTimes: [],
        debriefNudge: true
      }
    })

    await syncRoundAlarms(
      round({ debrief: { loggedAt: "2026-09-25T13:00:00.000Z" } })
    )

    expect([...alarms.keys()]).toEqual([])
  })

  it("clears only alarms belonging to the selected round", async () => {
    installChrome({}, [
      { name: "interview-reminder:rnd_one:1h", scheduledTime: 1 },
      { name: "interview-reminder:rnd_two:1h", scheduledTime: 2 },
      { name: "unrelated-alarm", scheduledTime: 3 }
    ])

    await clearRoundAlarms("rnd_one")

    expect([...alarms.keys()].sort()).toEqual([
      "interview-reminder:rnd_two:1h",
      "unrelated-alarm"
    ])
  })

  it("clears every interview reminder while preserving unrelated alarms", async () => {
    installChrome({}, [
      { name: "interview-reminder:rnd_one:1h", scheduledTime: 1 },
      { name: "interview-reminder:rnd_two:debrief", scheduledTime: 2 },
      { name: "unrelated-alarm", scheduledTime: 3 }
    ])

    await clearAllReminderAlarms()

    expect([...alarms.keys()]).toEqual(["unrelated-alarm"])
  })

  it("rebuilds alarms for all stored rounds", async () => {
    installChrome({
      [STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS]: {
        leadTimes: ["1h"],
        debriefNudge: false
      }
    })
    const apps = [
      application([
        round({ id: "rnd_one" }),
        round({ id: "rnd_two", time: "15:00" })
      ])
    ]

    await resyncAllReminderAlarms(apps)

    expect([...alarms.keys()].sort()).toEqual([
      "interview-reminder:rnd_one:1h",
      "interview-reminder:rnd_two:1h"
    ])
  })
})

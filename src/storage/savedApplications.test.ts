import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { GeneratedDocuments } from "~types/dialog"
import type { SavedApplication } from "~types/userProfile"

import { STORAGE_KEYS } from "./keys"
import {
  addRound,
  deleteRound,
  mutateSavedApplications,
  OpenRoundError,
  saveGeneratedDocuments,
  setApplicationStatus,
  setRoundDebrief,
  setRoundPrep,
  updateRound
} from "./savedApplications"

const NOW = new Date("2026-09-22T10:00:00.000Z")
const KEY = STORAGE_KEYS.SAVED_APPLICATIONS

let stored: Record<string, unknown>

function application(
  overrides: Partial<SavedApplication> = {}
): SavedApplication {
  return {
    id: "app-1",
    company: "Acme",
    jobTitle: "Engineer",
    status: "Saved",
    date: "2026-09-01",
    createdAt: "2026-09-01T09:00:00.000Z",
    ...overrides
  }
}

function savedApplications(): SavedApplication[] {
  return structuredClone((stored[KEY] as SavedApplication[] | undefined) ?? [])
}

function installChromeStorage(initial: SavedApplication[] = []): void {
  stored = { [KEY]: structuredClone(initial) }
  const alarms: chrome.alarms.Alarm[] = []

  const chromeFake = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({
          [key]: structuredClone(stored[key])
        })),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) {
            stored[key] = structuredClone(value)
          }
        })
      }
    },
    alarms: {
      getAll: vi.fn(async () => structuredClone(alarms)),
      clear: vi.fn(async (name: string) => {
        const index = alarms.findIndex((alarm) => alarm.name === name)
        if (index >= 0) alarms.splice(index, 1)
        return index >= 0
      }),
      create: vi.fn((name: string, info: chrome.alarms.AlarmCreateInfo) => {
        alarms.push({ name, scheduledTime: info.when ?? 0 })
      })
    }
  }
  vi.stubGlobal("chrome", chromeFake as unknown as typeof chrome)
}

describe("saved application mutations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    installChromeStorage()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("serializes concurrent read-modify-write operations", async () => {
    await Promise.all([
      mutateSavedApplications((apps) => [
        ...apps,
        application({ id: "app-1", company: "First" })
      ]),
      mutateSavedApplications((apps) => [
        ...apps,
        application({ id: "app-2", company: "Second" })
      ])
    ])

    expect(savedApplications().map((app) => app.id)).toEqual(["app-1", "app-2"])
  })

  it("continues the mutation queue after a rejected operation", async () => {
    await expect(
      mutateSavedApplications(() => {
        throw new Error("bad mutation")
      })
    ).rejects.toThrow("bad mutation")

    await mutateSavedApplications(() => [application()])

    expect(savedApplications()).toHaveLength(1)
  })

  it("promotes an application and records its first reply when adding a round", async () => {
    installChromeStorage([application({ status: "Applied" })])

    const round = await addRound("app-1", { type: "Technical" })
    const [updated] = savedApplications()

    expect(round.id).toMatch(/^rnd_/)
    expect(updated).toMatchObject({
      status: "Interviewing",
      statusUpdatedAt: NOW.toISOString(),
      firstReplyAt: NOW.toISOString()
    })
    expect(updated.rounds).toEqual([round])
  })

  it("rejects a second round while the application has an open round", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_open",
            type: "HR",
            createdAt: "2026-09-20T09:00:00.000Z"
          }
        ]
      })
    ])

    await expect(addRound("app-1", { type: "Final" })).rejects.toBeInstanceOf(
      OpenRoundError
    )
    expect(savedApplications()[0].rounds).toHaveLength(1)
  })

  it("allows a new round after the previous round has been debriefed", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_complete",
            type: "HR",
            createdAt: "2026-09-20T09:00:00.000Z",
            debrief: { loggedAt: "2026-09-21T09:00:00.000Z" }
          }
        ]
      })
    ])

    const round = await addRound("app-1", { type: "Technical" })

    expect(round.type).toBe("Technical")
    expect(savedApplications()[0].rounds).toHaveLength(2)
  })

  it("creates only one HR stub when entering Interviewing repeatedly", async () => {
    installChromeStorage([application()])

    await setApplicationStatus("app-1", "Interviewing")
    await setApplicationStatus("app-1", "Interviewing")

    const [updated] = savedApplications()
    expect(updated.rounds).toHaveLength(1)
    expect(updated.rounds?.[0]).toMatchObject({ type: "HR" })
    expect(updated.firstReplyAt).toBe(NOW.toISOString())
  })

  it("removes an untouched auto-created round when leaving Interviewing", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_pristine",
            type: "HR",
            createdAt: "2026-09-20T09:00:00.000Z"
          }
        ]
      })
    ])

    await setApplicationStatus("app-1", "Applied")

    expect(savedApplications()[0]).toMatchObject({
      status: "Applied",
      rounds: []
    })
  })

  it("preserves a configured round when leaving Interviewing", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_scheduled",
            type: "HR",
            date: "2026-09-25",
            createdAt: "2026-09-20T09:00:00.000Z"
          }
        ]
      })
    ])

    await setApplicationStatus("app-1", "Applied")

    expect(savedApplications()[0].rounds?.[0].id).toBe("rnd_scheduled")
  })

  it("derives queued prep patches from the latest stored prep", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_prep",
            type: "Technical",
            createdAt: "2026-09-20T09:00:00.000Z",
            prep: { notes: "Keep this" }
          }
        ]
      })
    ])

    await Promise.all([
      setRoundPrep("app-1", "rnd_prep", {
        likelyTopics: [{ text: "TypeScript" }]
      }),
      setRoundPrep("app-1", "rnd_prep", (prep) => ({
        notes: `${prep.notes} and this`,
        questionsToAsk: [{ text: "How does the team work?" }]
      }))
    ])

    expect(savedApplications()[0].rounds?.[0].prep).toEqual({
      notes: "Keep this and this",
      likelyTopics: [{ text: "TypeScript" }],
      questionsToAsk: [{ text: "How does the team work?" }]
    })
  })

  it("updates the selected round without changing its identity", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_update",
            type: "HR",
            createdAt: "2026-09-20T09:00:00.000Z"
          }
        ]
      })
    ])

    await updateRound("app-1", "rnd_update", {
      date: "2026-09-25",
      time: "14:30",
      format: "video"
    })

    expect(savedApplications()[0].rounds?.[0]).toEqual({
      id: "rnd_update",
      type: "HR",
      createdAt: "2026-09-20T09:00:00.000Z",
      date: "2026-09-25",
      time: "14:30",
      format: "video"
    })
  })

  it("deletes only the selected round", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        rounds: [
          {
            id: "rnd_delete",
            type: "HR",
            createdAt: "2026-09-20T09:00:00.000Z"
          },
          {
            id: "rnd_keep",
            type: "Technical",
            createdAt: "2026-09-21T09:00:00.000Z"
          }
        ]
      })
    ])

    await deleteRound("app-1", "rnd_delete")

    expect(savedApplications()[0].rounds?.map((round) => round.id)).toEqual([
      "rnd_keep"
    ])
  })

  it("applies debrief outcomes and keeps the original first-reply timestamp", async () => {
    installChromeStorage([
      application({
        status: "Interviewing",
        firstReplyAt: "2026-09-10T08:00:00.000Z",
        rounds: [
          {
            id: "rnd_debrief",
            type: "Final",
            createdAt: "2026-09-20T09:00:00.000Z"
          }
        ]
      })
    ])

    await setRoundDebrief("app-1", "rnd_debrief", {
      outcome: "offer",
      rating: 5
    })

    const [updated] = savedApplications()
    expect(updated).toMatchObject({
      status: "Offer",
      firstReplyAt: "2026-09-10T08:00:00.000Z"
    })
    expect(updated.rounds?.[0].debrief).toMatchObject({
      outcome: "offer",
      rating: 5,
      loggedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString()
    })
  })

  it("moves a corrected terminal outcome back to Interviewing", async () => {
    installChromeStorage([
      application({
        status: "Reject",
        firstReplyAt: "2026-09-10T08:00:00.000Z",
        rounds: [
          {
            id: "rnd_correct",
            type: "Final",
            createdAt: "2026-09-20T09:00:00.000Z",
            debrief: {
              outcome: "reject",
              loggedAt: "2026-09-21T09:00:00.000Z"
            }
          }
        ]
      })
    ])

    await setRoundDebrief("app-1", "rnd_correct", { outcome: "waiting" })

    const [updated] = savedApplications()
    expect(updated.status).toBe("Interviewing")
    expect(updated.rounds?.[0].debrief).toMatchObject({
      outcome: "waiting",
      loggedAt: "2026-09-21T09:00:00.000Z",
      updatedAt: NOW.toISOString()
    })
  })

  it("replaces documents without overwriting an existing application's details", async () => {
    installChromeStorage([
      application({
        company: "Original company",
        resumeContent: "Old resume"
      })
    ])
    const documents: GeneratedDocuments = {
      resumeContent: "New resume",
      resumeFilename: "resume.pdf",
      coverLetterContent: "New letter",
      coverLetterFilename: "letter.pdf"
    }

    const result = await saveGeneratedDocuments(
      {
        applicationId: "app-1",
        company: "Ignored company",
        jobTitle: "Ignored role"
      },
      documents
    )

    expect(result.application).toMatchObject({
      company: "Original company",
      jobTitle: "Engineer",
      ...documents
    })
  })

  it("creates a saved application when generated documents have no stored target", async () => {
    const documents: GeneratedDocuments = {
      resumeContent: "Resume",
      resumeFilename: "resume.pdf",
      coverLetterContent: "Letter",
      coverLetterFilename: "letter.pdf"
    }

    const result = await saveGeneratedDocuments(
      {
        company: "New company",
        jobTitle: "New role",
        jobUrl: "https://example.com/job"
      },
      documents
    )

    expect(result.application).toMatchObject({
      company: "New company",
      jobTitle: "New role",
      jobUrl: "https://example.com/job",
      status: "Saved",
      date: "2026-09-22",
      createdAt: NOW.toISOString(),
      statusUpdatedAt: NOW.toISOString(),
      ...documents
    })
    expect(result.application?.id).toBeTruthy()
  })
})

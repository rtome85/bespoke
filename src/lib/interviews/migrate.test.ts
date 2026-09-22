import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { INTERVIEWS_SCHEMA_VERSION, STORAGE_KEYS } from "~storage/keys"
import type { SavedApplication } from "~types/userProfile"

import {
  migrateApplication,
  migrateInterviewsSchema,
  migrateRestoredApplications
} from "./migrate"

const NOW = new Date("2026-09-22T10:00:00.000Z")
const APPS_KEY = STORAGE_KEYS.SAVED_APPLICATIONS
const VERSION_KEY = STORAGE_KEYS.INTERVIEWS_SCHEMA_VERSION

let stored: Record<string, unknown>

function legacyApplication(
  status = "1st Technical Interview"
): SavedApplication {
  return {
    id: "app-1",
    company: "Acme",
    jobTitle: "Engineer",
    status,
    date: "2026-08-01",
    createdAt: "2026-08-01T09:00:00.000Z",
    statusUpdatedAt: "2026-09-20T15:30:00.000Z",
    preparationPlan: {
      content: "Review system design",
      generatedAt: "2026-09-19T08:00:00.000Z"
    },
    isFavorite: true
  } as unknown as SavedApplication
}

function installChromeStorage(values: Record<string, unknown>): void {
  stored = structuredClone(values)
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
    }
  }
  vi.stubGlobal("chrome", chromeFake as unknown as typeof chrome)
}

describe("interview schema migration", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    installChromeStorage({ [APPS_KEY]: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each([
    ["HR Interview", "HR"],
    ["1st Technical Interview", "Technical"],
    ["2nd Technical Interview", "Technical"],
    ["Final Interview", "Final"]
  ])(
    "maps %s to an Interviewing application with a %s round",
    (status, type) => {
      const migrated = migrateApplication(legacyApplication(status))

      expect(migrated.status).toBe("Interviewing")
      expect(migrated.rounds?.[0]).toMatchObject({
        type,
        date: "2026-09-20",
        synthesized: true,
        createdAt: NOW.toISOString(),
        prep: {
          notes: "Review system design",
          topicsPointsAt: "2026-09-19T08:00:00.000Z"
        }
      })
      expect(migrated).not.toHaveProperty("preparationPlan")
      expect(migrated).not.toHaveProperty("isFavorite")
    }
  )

  it("preserves existing rounds instead of synthesizing a duplicate", () => {
    const existingRound = {
      id: "rnd_existing",
      type: "Technical" as const,
      createdAt: "2026-09-10T09:00:00.000Z"
    }
    const migrated = migrateApplication({
      ...legacyApplication(),
      rounds: [existingRound]
    })

    expect(migrated.rounds).toEqual([existingRound])
  })

  it("is idempotent after legacy fields have been removed", () => {
    const first = migrateApplication(legacyApplication())
    const second = migrateApplication(first)

    expect(second).toBe(first)
  })

  it("passes malformed stored entries through without throwing", () => {
    expect(migrateApplication(null as unknown as SavedApplication)).toBeNull()
    expect(
      migrateApplication("bad record" as unknown as SavedApplication)
    ).toBe("bad record")
  })

  it("does not downgrade data already stamped with a newer schema", async () => {
    installChromeStorage({
      [APPS_KEY]: [legacyApplication()],
      [VERSION_KEY]: INTERVIEWS_SCHEMA_VERSION + 1
    })

    await migrateInterviewsSchema()

    const apps = stored[APPS_KEY] as SavedApplication[]
    expect(apps[0].status).toBe("1st Technical Interview")
    expect(stored[VERSION_KEY]).toBe(INTERVIEWS_SCHEMA_VERSION + 1)
  })

  it("migrates an unstamped application list and writes the schema version", async () => {
    installChromeStorage({ [APPS_KEY]: [legacyApplication()] })

    await migrateInterviewsSchema()

    const apps = stored[APPS_KEY] as SavedApplication[]
    expect(apps[0].status).toBe("Interviewing")
    expect(apps[0].rounds).toHaveLength(1)
    expect(stored[VERSION_KEY]).toBe(INTERVIEWS_SCHEMA_VERSION)
  })

  it("adopts a restored newer version without applying an older migration", async () => {
    installChromeStorage({ [APPS_KEY]: [legacyApplication()] })

    await migrateRestoredApplications(INTERVIEWS_SCHEMA_VERSION + 2)

    const apps = stored[APPS_KEY] as SavedApplication[]
    expect(apps[0].status).toBe("1st Technical Interview")
    expect(stored[VERSION_KEY]).toBe(INTERVIEWS_SCHEMA_VERSION + 2)
  })

  it("migrates restored applications when their source version is absent", async () => {
    installChromeStorage({ [APPS_KEY]: [legacyApplication()] })

    await migrateRestoredApplications(undefined)

    const apps = stored[APPS_KEY] as SavedApplication[]
    expect(apps[0].status).toBe("Interviewing")
    expect(stored[VERSION_KEY]).toBe(INTERVIEWS_SCHEMA_VERSION)
  })
})

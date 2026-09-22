import { describe, expect, it } from "vitest"

import type {
  PerplexityConfig,
  ProvidersConfig,
  SearchConfig
} from "~types/config"
import type { OperationStatus, ProviderTestState } from "~types/options"

import {
  maskKey,
  perplexityStatus,
  providerRoster,
  providerStatus,
  searchStatus
} from "./providerStatus"

const idle: OperationStatus = { type: "idle", message: "" }

describe("maskKey", () => {
  it("reveals only a recognizable prefix and final four characters", () => {
    expect(maskKey("sk-proj-abcdefgh1234")).toBe("sk-proj-…1234")
    expect(maskKey("abcdefghijk1234")).toBe("abcd…1234")
    expect(maskKey("short")).toBe("••••")
    expect(maskKey("")).toBe("")
  })
})

describe("providerStatus", () => {
  it("requires the provider's configured credential", () => {
    expect(providerStatus("openai", {}, {})).toEqual({
      label: "Not connected",
      tone: "idle"
    })
    expect(
      providerStatus(
        "custom",
        { custom: { apiKey: "optional", enabled: true, baseUrl: "  " } },
        {}
      )
    ).toEqual({ label: "Not connected", tone: "idle" })
  })

  it("reports disabled accounts before considering test results", () => {
    expect(
      providerStatus(
        "openai",
        { openai: { apiKey: "secret", enabled: false } },
        { openai: { type: "ok", message: "", source: "test" } }
      )
    ).toEqual({ label: "Disabled", tone: "idle" })
  })

  it.each([
    ["loading", "Testing…", "idle"],
    ["ok", "Connected", "ok"],
    ["err", "Test failed", "bad"]
  ] as const)("uses a live %s connection verdict", (type, label, tone) => {
    expect(
      providerStatus(
        "openai",
        { openai: { apiKey: "secret", enabled: true } },
        { openai: { type, message: "", source: "test" } }
      )
    ).toEqual({ label, tone })
  })

  it("ignores model-refresh results as connectivity verdicts", () => {
    expect(
      providerStatus(
        "openai",
        { openai: { apiKey: "secret", enabled: true } },
        { openai: { type: "ok", message: "", source: "models" } }
      )
    ).toEqual({ label: "Key untested", tone: "warn" })
  })

  it("uses persisted verdicts and distinguishes untested URLs", () => {
    expect(
      providerStatus(
        "anthropic",
        {
          anthropic: {
            apiKey: "secret",
            enabled: true,
            lastTested: { ok: false, at: "now", message: "failed" }
          }
        },
        {}
      )
    ).toEqual({ label: "Test failed", tone: "bad" })
    expect(
      providerStatus(
        "custom",
        {
          custom: {
            apiKey: "",
            baseUrl: "http://localhost:1234",
            enabled: true
          }
        },
        {}
      )
    ).toEqual({ label: "URL untested", tone: "warn" })
  })

  it("treats a configured local Ollama endpoint as connected", () => {
    expect(
      providerStatus("ollama", { ollama: { apiKey: "", enabled: true } }, {})
    ).toEqual({ label: "Connected", tone: "ok" })
  })
})

describe("research account statuses", () => {
  const perplexity: PerplexityConfig = {
    apiKey: "secret",
    enabled: true,
    customPrompt: "Research {{companyName}}"
  }
  const search: SearchConfig = {
    engine: "brave",
    apiKey: "secret",
    enabled: true
  }

  it("uses live operation states before persisted verdicts", () => {
    expect(
      perplexityStatus(perplexity, { type: "loading", message: "" })
    ).toEqual({ label: "Testing…", tone: "idle" })
    expect(
      searchStatus(search, { type: "success", message: "connected" })
    ).toEqual({ label: "Connected", tone: "ok" })
    expect(searchStatus(search, { type: "error", message: "failed" })).toEqual({
      label: "Test failed",
      tone: "bad"
    })
  })

  it("requires enabled keys and otherwise reports untested accounts", () => {
    expect(perplexityStatus({ ...perplexity, apiKey: "" }, idle)).toEqual({
      label: "Not connected",
      tone: "idle"
    })
    expect(searchStatus({ ...search, enabled: false }, idle)).toEqual({
      label: "Disabled",
      tone: "idle"
    })
    expect(perplexityStatus(perplexity, idle)).toEqual({
      label: "Key untested",
      tone: "warn"
    })
  })
})

describe("providerRoster", () => {
  it("builds every model and research row with safe metadata", () => {
    const providers: ProvidersConfig = {
      ollama: {
        apiKey: "",
        baseUrl: "http://localhost:11434/api",
        enabled: true
      },
      openai: { apiKey: "sk-secret-value-1234", enabled: true },
      custom: {
        apiKey: "",
        baseUrl: "https://models.example.test/v1",
        enabled: true
      }
    }
    const tests: ProviderTestState = {}
    const perplexity: PerplexityConfig = {
      apiKey: "pplx-secret-value-9876",
      enabled: true,
      customPrompt: "Research {{companyName}}"
    }
    const search: SearchConfig = {
      engine: "brave",
      apiKey: "brave-secret-value-4567",
      enabled: true
    }

    const rows = providerRoster(
      providers,
      perplexity,
      tests,
      idle,
      search,
      idle
    )

    expect(rows).toHaveLength(10)
    expect(rows.find((row) => row.id === "ollama")).toMatchObject({
      access: "Local · Free",
      meta: "localhost:11434"
    })
    expect(rows.find((row) => row.id === "openai")?.meta).toBe("sk-…1234")
    expect(rows.find((row) => row.id === "custom")).toMatchObject({
      access: "Self-hosted",
      meta: "models.example.test"
    })
    expect(rows.at(-1)).toMatchObject({
      id: "websearch",
      name: "Brave Search",
      access: "Research only"
    })
  })
})

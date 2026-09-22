import { describe, expect, it } from "vitest"

import type { ProvidersConfig } from "~types/config"

import {
  connectedProviders,
  decodeRoute,
  encodeRoute,
  fmtCost,
  providerModels,
  runCost
} from "./modelRouting"

describe("model routing helpers", () => {
  it("round-trips route targets whose model identifiers contain colons", () => {
    const target = { provider: "ollama" as const, model: "gpt-oss:20b-cloud" }

    expect(decodeRoute(encodeRoute(target))).toEqual(target)
  })

  it("prefers a provider's stored model catalogue", () => {
    const providers: ProvidersConfig = {
      openai: {
        apiKey: "sk-test",
        enabled: true,
        models: ["custom-model"]
      }
    }

    expect(providerModels("openai", providers)).toEqual(["custom-model"])
  })

  it("falls back to built-in model catalogues", () => {
    expect(providerModels("openai", {})).toContain("gpt-4o-mini")
    expect(providerModels("ollama", {})).toContain("gpt-oss:20b-cloud")
  })

  it("returns only enabled providers with their required credentials", () => {
    const providers: ProvidersConfig = {
      ollama: { apiKey: "oll-key", enabled: true },
      openai: { apiKey: "", enabled: true },
      anthropic: { apiKey: "ant-key", enabled: false },
      custom: { apiKey: "", baseUrl: " https://llm.test/v1 ", enabled: true }
    }

    expect(connectedProviders(providers)).toEqual(["ollama", "custom"])
  })

  it("estimates known model costs and leaves local models unpriced", () => {
    expect(runCost("gpt-4o-mini", "scoring")).toBeCloseTo(0.0016)
    expect(runCost("gpt-oss:20b-cloud", "scoring")).toBeNull()
  })

  it("formats sub-cent, sub-dollar, and multi-dollar costs", () => {
    expect(fmtCost(0.001)).toBe("<$0.01")
    expect(fmtCost(0.1254)).toBe("$0.125")
    expect(fmtCost(2.555)).toBe("$2.56")
  })
})

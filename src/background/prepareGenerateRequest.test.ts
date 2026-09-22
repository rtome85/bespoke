import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_LLM_TUNING } from "~constants/generation"
import { DEFAULT_PROMPTS } from "~constants/prompts"
import { STORAGE_KEYS } from "~storage/keys"
import type { ModelRouting, ProvidersConfig } from "~types/config"

import {
  prepareGenerateRequest,
  resolveJobRoute
} from "./prepareGenerateRequest"

let stored: Record<string, unknown>

function routing(overrides: Partial<ModelRouting> = {}): ModelRouting {
  return {
    scoring: { provider: "openai", model: "score-model" },
    drafting: { provider: "openai", model: "draft-model" },
    prep: { provider: "openai", model: "prep-model" },
    research: "auto",
    fallback: {
      enabled: true,
      target: { provider: "anthropic", model: "fallback-model" }
    },
    ...overrides
  }
}

function providers(): ProvidersConfig {
  return {
    openai: { apiKey: "openai-key", enabled: true },
    anthropic: { apiKey: "anthropic-key", enabled: true }
  }
}

function installChrome(values: Record<string, unknown>): void {
  stored = structuredClone(values)
  const chromeFake = {
    storage: {
      local: {
        get: vi.fn(
          (
            keys: string | string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            const requested = Array.isArray(keys) ? keys : [keys]
            callback(
              Object.fromEntries(requested.map((key) => [key, stored[key]]))
            )
          }
        )
      }
    }
  }
  vi.stubGlobal("chrome", chromeFake as unknown as typeof chrome)
}

describe("generation request routing", () => {
  beforeEach(() => {
    installChrome({
      [STORAGE_KEYS.PROVIDERS]: providers(),
      [STORAGE_KEYS.MODEL_ROUTING]: routing()
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("builds a request with its routed primary and fallback providers", async () => {
    const customPrompts = {
      ...DEFAULT_PROMPTS,
      resumeSystemPrompt: "Custom resume prompt"
    }
    stored[STORAGE_KEYS.CUSTOM_PROMPTS] = customPrompts
    stored[STORAGE_KEYS.LLM_TUNING] = { temperature: 1.1 }

    const result = await prepareGenerateRequest(
      {
        companyName: "Acme",
        jobTitle: "Engineer",
        jobDescription: "Build reliable systems"
      },
      "scoring"
    )

    expect(result).toMatchObject({
      ok: true,
      primary: {
        provider: "openai",
        model: "score-model",
        clientConfig: { apiKey: "openai-key" }
      },
      fallback: {
        provider: "anthropic",
        model: "fallback-model",
        clientConfig: { apiKey: "anthropic-key" }
      },
      request: {
        jobDescription: "Build reliable systems",
        model: "score-model",
        prompts: customPrompts,
        llmTuning: { ...DEFAULT_LLM_TUNING, temperature: 1.1 }
      }
    })
  })

  it("uses pending selected text when the caller has no job description", async () => {
    stored[STORAGE_KEYS.PENDING_JOB_DATA] = {
      selectedText: "Stored job description"
    }

    const result = await prepareGenerateRequest(
      { companyName: "Acme", jobTitle: "Engineer" },
      "drafting"
    )

    expect(result).toMatchObject({
      ok: true,
      request: {
        jobDescription: "Stored job description",
        model: "draft-model"
      }
    })
  })

  it("returns a user-facing error when no job description is available", async () => {
    const result = await prepareGenerateRequest(
      { companyName: "Acme", jobTitle: "Engineer" },
      "scoring"
    )

    expect(result).toEqual({
      ok: false,
      message:
        "No job description found. Right-click on a job posting and select 'Check my match for this job'."
    })
  })

  it("normalizes an older routing table so prep inherits drafting", async () => {
    stored[STORAGE_KEYS.MODEL_ROUTING] = routing({
      prep: undefined,
      fallback: {
        enabled: false,
        target: { provider: "anthropic", model: "unused" }
      }
    })

    const result = await resolveJobRoute("prep")

    expect(result).toEqual({
      primary: {
        provider: "openai",
        model: "draft-model",
        clientConfig: { apiKey: "openai-key", baseUrl: undefined }
      }
    })
  })

  it("omits a configured fallback that cannot resolve", async () => {
    stored[STORAGE_KEYS.PROVIDERS] = {
      ...providers(),
      anthropic: { apiKey: "", enabled: true }
    }

    const result = await resolveJobRoute("scoring")

    expect(result).toEqual({
      primary: {
        provider: "openai",
        model: "score-model",
        clientConfig: { apiKey: "openai-key", baseUrl: undefined }
      }
    })
  })

  it.each([
    [
      "disabled provider",
      { openai: { apiKey: "openai-key", enabled: false } },
      routing({
        fallback: {
          enabled: false,
          target: { provider: "openai", model: "unused" }
        }
      }),
      "OpenAI is not connected. Connect it in Settings."
    ],
    [
      "missing API key",
      { openai: { apiKey: "", enabled: true } },
      routing({
        fallback: {
          enabled: false,
          target: { provider: "openai", model: "unused" }
        }
      }),
      "OpenAI needs an API key. Add it in Settings."
    ],
    [
      "missing custom base URL",
      { custom: { apiKey: "", baseUrl: " ", enabled: true } },
      routing({
        scoring: { provider: "custom", model: "custom-model" },
        fallback: {
          enabled: false,
          target: { provider: "custom", model: "unused" }
        }
      }),
      "Custom endpoint needs a base URL. Add it in Settings."
    ]
  ])(
    "reports a %s",
    async (_label, configuredProviders, configuredRouting, message) => {
      stored[STORAGE_KEYS.PROVIDERS] = configuredProviders
      stored[STORAGE_KEYS.MODEL_ROUTING] = configuredRouting

      await expect(resolveJobRoute("scoring")).resolves.toEqual({
        error: message
      })
    }
  )

  it("handles an unknown provider restored from untrusted storage", async () => {
    stored[STORAGE_KEYS.MODEL_ROUTING] = routing({
      scoring: { provider: "unknown", model: "bad-model" }
    } as unknown as Partial<ModelRouting>)

    const result = await resolveJobRoute("scoring")

    expect(result).toEqual({
      error:
        'Unknown provider "unknown" in Model routing. Pick a model in Settings.'
    })
  })

  it("migrates legacy Ollama settings when provider routing is absent", async () => {
    installChrome({
      [STORAGE_KEYS.OLLAMA_CONFIG]: {
        apiKey: "ollama-key",
        baseUrl: "https://ollama.test/api",
        enabled: true
      },
      [STORAGE_KEYS.LAST_SELECTED_MODEL]: "legacy-model"
    })

    const result = await resolveJobRoute("scoring")

    expect(result).toEqual({
      primary: {
        provider: "ollama",
        model: "legacy-model",
        clientConfig: {
          apiKey: "ollama-key",
          baseUrl: "https://ollama.test/api"
        }
      }
    })
  })
})

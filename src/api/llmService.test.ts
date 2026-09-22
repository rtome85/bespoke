import { describe, expect, it, vi } from "vitest"

import { DEFAULT_LLM_TUNING } from "~constants/generation"
import { DEFAULT_PROMPTS } from "~constants/prompts"
import type { GenerateRequest } from "~types/config"
import { DEFAULT_USER_PROFILE } from "~types/userProfile"

import type { LLMClient } from "./llm/types"
import { LLMService } from "./llmService"

function serviceReturning(content: string): {
  service: LLMService
  chat: ReturnType<typeof vi.fn>
} {
  const chat = vi.fn(async () => content)
  const client: LLMClient = {
    chat,
    listModels: async () => [],
    testConnection: async () => true
  }
  return { service: new LLMService(client), chat }
}

function request(overrides: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    jobDescription: "Build reliable TypeScript services",
    companyName: "Acme",
    jobTitle: "Engineer",
    model: "test-model",
    prompts: DEFAULT_PROMPTS,
    userProfile: structuredClone(DEFAULT_USER_PROFILE),
    llmTuning: { ...DEFAULT_LLM_TUNING, temperature: 1.2 },
    ...overrides
  }
}

describe("LLM response parsing", () => {
  it("extracts fenced match JSON, clamps scores, and caps structured temperature", async () => {
    const { service, chat } = serviceReturning(`Here is the result:
\`\`\`json
{
  "skillsCoverage": "120",
  "experienceMatch": -10,
  "domainFit": 50,
  "bonusSkills": "not a number",
  "languageRequirements": [],
  "summary": "Good adjacent fit.",
  "strengths": ["TypeScript", 42],
  "weaknesses": "not-an-array",
  "improvements": ["Learn the domain"]
}
\`\`\``)

    const result = await service.analyzeMatch(request())

    expect(result).toEqual({
      percentage: 50,
      summary: "Good adjacent fit.",
      strengths: ["TypeScript", "42"],
      weaknesses: [],
      improvements: ["Learn the domain"]
    })
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        temperature: 0.4,
        signal: expect.any(AbortSignal)
      })
    )
  })

  it("returns the empty match fallback for malformed JSON", async () => {
    const { service } = serviceReturning("This is not JSON")

    await expect(service.analyzeMatch(request())).resolves.toEqual({
      percentage: 0,
      summary: "Match analysis unavailable.",
      strengths: [],
      weaknesses: [],
      improvements: []
    })
  })

  it("zeroes the score for an unmet required human language", async () => {
    const { service } = serviceReturning(
      JSON.stringify({
        skillsCoverage: 100,
        experienceMatch: 100,
        domainFit: 100,
        bonusSkills: 100,
        languageRequirements: [
          {
            language: "French",
            level: "B2",
            required: true,
            candidateMeets: false
          }
        ],
        summary: "Strong technical fit.",
        strengths: ["TypeScript"],
        weaknesses: [],
        improvements: []
      })
    )

    const result = await service.analyzeMatch(request())

    expect(result.percentage).toBe(0)
    expect(result.summary).toContain("French (B2)")
    expect(result.weaknesses[0]).toContain("French (B2)")
  })

  it("does not trust a false language verdict when the profile lists an alias", async () => {
    const profile = structuredClone(DEFAULT_USER_PROFILE)
    profile.languages = [{ id: "lang-1", name: "Français", level: "Native" }]
    const { service } = serviceReturning(
      JSON.stringify({
        skillsCoverage: 100,
        experienceMatch: 100,
        domainFit: 100,
        bonusSkills: 100,
        languageRequirements: [
          {
            language: "French",
            level: "C1",
            required: true,
            candidateMeets: false
          }
        ],
        summary: "Strong fit.",
        strengths: [],
        weaknesses: [],
        improvements: []
      })
    )

    const result = await service.analyzeMatch(request({ userProfile: profile }))

    expect(result.percentage).toBe(100)
    expect(result.summary).toBe("Strong fit.")
  })

  it("handles required languages when no candidate profile is stored", async () => {
    const { service } = serviceReturning(
      JSON.stringify({
        skillsCoverage: 80,
        experienceMatch: 80,
        domainFit: 80,
        bonusSkills: 80,
        languageRequirements: [
          {
            language: "German",
            level: "B2",
            required: true,
            candidateMeets: false
          }
        ],
        summary: "Good technical fit.",
        strengths: [],
        weaknesses: [],
        improvements: []
      })
    )

    const result = await service.analyzeMatch(
      request({ userProfile: undefined })
    )

    expect(result.percentage).toBe(0)
    expect(result.summary).toContain("German (B2)")
  })

  it("extracts job details from JSON surrounded by prose and coerces values", async () => {
    const { service } = serviceReturning(
      'Result: {"companyName":123,"jobTitle":"Engineer","jobDescription":"Build systems"} done.'
    )

    await expect(
      service.extractJobDetails("raw posting", "model")
    ).resolves.toEqual({
      companyName: "123",
      jobTitle: "Engineer",
      jobDescription: "Build systems"
    })
  })

  it.each([
    ["a response without JSON", "plain prose", "No JSON in response"],
    ["an empty JSON object", "{}", "Missing required fields"]
  ])("rejects %s", async (_label, content, message) => {
    const { service } = serviceReturning(content)

    await expect(service.extractJobDetails("raw", "model")).rejects.toThrow(
      message
    )
  })
})

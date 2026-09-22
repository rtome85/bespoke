import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import analyzeMatch from "./messages/analyzeMatch"
import generateDocuments from "./messages/generateDocuments"
import generateTopicLesson, {
  parseLesson
} from "./messages/generateTopicLesson"
import listProviderModels from "./messages/listProviderModels"
import testProviderConnection from "./messages/testOllamaConnection"

const mocks = vi.hoisted(() => ({
  analyzeMatch: vi.fn(),
  chat: vi.fn(),
  formatUserProfile: vi.fn(),
  generateDocuments: vi.fn(),
  getLLMClient: vi.fn(),
  prepareGenerateRequest: vi.fn(),
  resolveJobRoute: vi.fn()
}))

vi.mock("~api/llm", () => ({
  getLLMClient: mocks.getLLMClient
}))

vi.mock("~api/llmService", () => ({
  formatUserProfile: mocks.formatUserProfile,
  LLMService: class {
    analyzeMatch(request: unknown) {
      return mocks.analyzeMatch(request)
    }

    generateResumeAndCoverLetter(request: unknown) {
      return mocks.generateDocuments(request)
    }
  }
}))

vi.mock("~background/prepareGenerateRequest", () => ({
  prepareGenerateRequest: mocks.prepareGenerateRequest,
  resolveJobRoute: mocks.resolveJobRoute
}))

const primary = {
  provider: "openai",
  model: "primary-model",
  clientConfig: { apiKey: "primary-key" }
}

const fallback = {
  provider: "anthropic",
  model: "fallback-model",
  clientConfig: { apiKey: "fallback-key" }
}

const preparedRequest = {
  jobDescription: "Build reliable systems",
  companyName: "Acme",
  jobTitle: "Engineer",
  model: "stored-model",
  prompts: {},
  llmTuning: {}
}

async function invoke(
  handler: (...args: any[]) => unknown,
  body?: unknown
): Promise<ReturnType<typeof vi.fn>> {
  const send = vi.fn()
  await handler({ body }, { send })
  return send
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getLLMClient.mockReturnValue({ chat: mocks.chat })
  mocks.formatUserProfile.mockReturnValue("Formatted profile")
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(undefined)
      }
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("analyzeMatch message", () => {
  it("returns preparation errors without constructing a client", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: false,
      message: "No job description found"
    })

    const send = await invoke(analyzeMatch, {})

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "No job description found"
    })
    expect(mocks.getLLMClient).not.toHaveBeenCalled()
  })

  it("returns a successful primary match analysis", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: true,
      request: preparedRequest,
      primary
    })
    mocks.analyzeMatch.mockResolvedValue({ score: 87 })

    const send = await invoke(analyzeMatch, { jobDescription: "job" })

    expect(mocks.prepareGenerateRequest).toHaveBeenCalledWith(
      { jobDescription: "job" },
      "scoring"
    )
    expect(mocks.analyzeMatch).toHaveBeenCalledWith({
      ...preparedRequest,
      model: "primary-model"
    })
    expect(send).toHaveBeenCalledWith({
      success: true,
      message: "Match analysis complete!",
      data: { match: { score: 87 } }
    })
  })

  it("retries match analysis on the configured fallback route", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: true,
      request: preparedRequest,
      primary,
      fallback
    })
    mocks.analyzeMatch
      .mockRejectedValueOnce(new Error("primary offline"))
      .mockResolvedValueOnce({ score: 72 })

    const send = await invoke(analyzeMatch, {})

    expect(mocks.getLLMClient).toHaveBeenNthCalledWith(
      1,
      "openai",
      primary.clientConfig
    )
    expect(mocks.getLLMClient).toHaveBeenNthCalledWith(
      2,
      "anthropic",
      fallback.clientConfig
    )
    expect(mocks.analyzeMatch).toHaveBeenLastCalledWith({
      ...preparedRequest,
      model: "fallback-model"
    })
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it("converts an exhausted provider failure into a response", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: true,
      request: preparedRequest,
      primary
    })
    mocks.analyzeMatch.mockRejectedValue(new Error("provider unavailable"))

    const send = await invoke(analyzeMatch, {})

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "provider unavailable"
    })
  })
})

describe("generateDocuments message", () => {
  it("handles a missing request body without throwing out of the handler", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: false,
      message: "No job description found"
    })

    const send = await invoke(generateDocuments)

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "No job description found"
    })
  })

  it("generates both documents and clears pending job data", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: true,
      request: preparedRequest,
      primary
    })
    mocks.generateDocuments.mockResolvedValue({
      resume: "# Resume",
      coverLetter: "# Cover letter"
    })

    const send = await invoke(generateDocuments, {
      companyName: "Acme Inc.",
      jobTitle: "Senior Engineer"
    })

    expect(mocks.generateDocuments).toHaveBeenCalledWith({
      ...preparedRequest,
      model: "primary-model"
    })
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(["pendingJobData"])
    expect(send).toHaveBeenCalledWith({
      success: true,
      message: "Documents generated!",
      data: {
        resumeContent: "# Resume",
        resumeFilename: "roberto-tome-resume-acme-inc.md",
        coverLetterContent: "# Cover letter",
        coverLetterFilename: "roberto-tome-cover-letter-acme-inc.md"
      }
    })
  })

  it("uses the fallback route after primary document generation fails", async () => {
    mocks.prepareGenerateRequest.mockResolvedValue({
      ok: true,
      request: preparedRequest,
      primary,
      fallback
    })
    mocks.generateDocuments
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce({ resume: "resume", coverLetter: "letter" })

    const send = await invoke(generateDocuments, {
      companyName: "Acme",
      jobTitle: "Engineer"
    })

    expect(mocks.generateDocuments).toHaveBeenLastCalledWith({
      ...preparedRequest,
      model: "fallback-model"
    })
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it("does not clear pending data after a generation failure", async () => {
    mocks.prepareGenerateRequest.mockRejectedValue(new Error("storage failed"))

    const send = await invoke(generateDocuments, {
      companyName: "Acme",
      jobTitle: "Engineer"
    })

    expect(chrome.storage.local.remove).not.toHaveBeenCalled()
    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "storage failed"
    })
  })
})

describe("listProviderModels message", () => {
  it("handles a missing request body as an unknown provider", async () => {
    const send = await invoke(listProviderModels)

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "Unknown provider",
      models: []
    })
  })

  it("rejects a provider whose required credential is missing", async () => {
    const send = await invoke(listProviderModels, {
      provider: "openai",
      apiKey: ""
    })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "Please enter an API key first",
      models: ["gpt-4o-mini", "gpt-4o", "o4-mini"]
    })
    expect(mocks.getLLMClient).not.toHaveBeenCalled()
  })

  it("returns discovered models or the provider fallback list", async () => {
    const listModels = vi
      .fn()
      .mockResolvedValueOnce(["gpt-test"])
      .mockResolvedValueOnce([])
    mocks.getLLMClient.mockReturnValue({ listModels })

    const first = await invoke(listProviderModels, {
      provider: "openai",
      apiKey: "secret"
    })
    const second = await invoke(listProviderModels, {
      provider: "openai",
      apiKey: "secret"
    })

    expect(first).toHaveBeenCalledWith({
      success: true,
      models: ["gpt-test"]
    })
    expect(second).toHaveBeenCalledWith({
      success: true,
      models: ["gpt-4o-mini", "gpt-4o", "o4-mini"]
    })
  })

  it("returns fallback models when the client unexpectedly throws", async () => {
    mocks.getLLMClient.mockReturnValue({
      listModels: vi.fn().mockRejectedValue(new Error("catalog unavailable"))
    })

    const send = await invoke(listProviderModels, {
      provider: "openai",
      apiKey: "secret"
    })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "catalog unavailable",
      models: ["gpt-4o-mini", "gpt-4o", "o4-mini"]
    })
  })
})

describe("test provider connection message", () => {
  it("handles a missing request body using the backwards-compatible Ollama default", async () => {
    mocks.getLLMClient.mockReturnValue({
      testConnection: vi.fn().mockResolvedValue(false)
    })

    const send = await invoke(testProviderConnection)

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "Ollama connection failed. Check the key and URL."
    })
  })

  it("rejects missing credentials before testing the client", async () => {
    const send = await invoke(testProviderConnection, {
      provider: "anthropic",
      apiKey: ""
    })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "Please enter an API key first"
    })
    expect(mocks.getLLMClient).not.toHaveBeenCalled()
  })

  it("reports successful and unsuccessful provider tests", async () => {
    const testConnection = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    mocks.getLLMClient.mockReturnValue({ testConnection })

    const success = await invoke(testProviderConnection, {
      provider: "google",
      apiKey: "secret"
    })
    const failure = await invoke(testProviderConnection, {
      provider: "google",
      apiKey: "secret"
    })

    expect(success).toHaveBeenCalledWith({
      success: true,
      message: "Google Gemini connection successful."
    })
    expect(failure).toHaveBeenCalledWith({
      success: false,
      message: "Google Gemini connection failed. Check the key and URL."
    })
  })

  it("converts unexpected client failures into an error response", async () => {
    mocks.getLLMClient.mockReturnValue({
      testConnection: vi.fn().mockRejectedValue(new Error("request crashed"))
    })

    const send = await invoke(testProviderConnection, {
      provider: "openai",
      apiKey: "secret"
    })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "request crashed"
    })
  })
})

describe("generateTopicLesson message", () => {
  it("rejects a blank lesson title before loading routing", async () => {
    const send = await invoke(generateTopicLesson, { title: "   " })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "Nothing to expand on."
    })
    expect(mocks.resolveJobRoute).not.toHaveBeenCalled()
  })

  it("returns routing errors without creating a client", async () => {
    mocks.resolveJobRoute.mockResolvedValue({ error: "No prep model" })

    const send = await invoke(generateTopicLesson, { title: "Queues" })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "No prep model"
    })
  })

  it("generates, normalizes, and timestamps a lesson", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"))
    mocks.resolveJobRoute.mockResolvedValue({ primary })
    mocks.chat.mockResolvedValue(
      "```markdown\n# Queues\n\nA $\\rightarrow$ B\n```"
    )

    const send = await invoke(generateTopicLesson, {
      kind: "question",
      title: "  Explain queues  ",
      topic: "Data structures",
      detail: "FIFO",
      roundType: "Technical",
      companyName: "Acme",
      jobTitle: "Engineer"
    })

    expect(mocks.resolveJobRoute).toHaveBeenCalledWith("prep")
    expect(mocks.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "primary-model",
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 4_000,
        signal: expect.any(AbortSignal)
      })
    )
    expect(send).toHaveBeenCalledWith({
      success: true,
      markdown: "# Queues\n\nA → B",
      generatedAt: "2026-09-22T12:00:00.000Z"
    })
  })

  it("retries an empty-safe lesson on the fallback provider", async () => {
    mocks.resolveJobRoute.mockResolvedValue({ primary, fallback })
    mocks.chat
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce("Fallback lesson")

    const send = await invoke(generateTopicLesson, {
      kind: "exercise",
      title: "Build a queue",
      roundType: "Technical",
      companyName: "Acme",
      jobTitle: "Engineer"
    })

    expect(mocks.getLLMClient).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        markdown: "Fallback lesson"
      })
    )
  })

  it("rejects an empty model response", async () => {
    mocks.resolveJobRoute.mockResolvedValue({ primary })
    mocks.chat.mockResolvedValue("   ")

    const send = await invoke(generateTopicLesson, {
      kind: "question",
      title: "Queues",
      roundType: "Technical",
      companyName: "Acme",
      jobTitle: "Engineer"
    })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "The model didn't return a lesson. Try again."
    })
  })
})

describe("parseLesson", () => {
  it("preserves internal code fences while removing a whole-response fence", () => {
    expect(
      parseLesson("```markdown\nUse this:\n\n```ts\nconst value = 1\n```\n```")
    ).toBe("Use this:\n\n```ts\nconst value = 1\n```")
  })

  it("caps runaway lesson responses before storage", () => {
    expect(parseLesson("x".repeat(21_000))).toHaveLength(20_000)
  })
})

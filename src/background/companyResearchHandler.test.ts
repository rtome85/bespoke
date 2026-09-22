import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CompanyInfo } from "~types/companyResearch"
import type { ModelRouting } from "~types/config"

import generateCompanyResearch from "./messages/generateCompanyResearch"

const mocks = vi.hoisted(() => ({
  chat: vi.fn(),
  companyInfoToMarkdown: vi.fn(),
  fetchCompanyInfo: vi.fn(),
  fetchCompanyPages: vi.fn(),
  getLLMClient: vi.fn(),
  hasHostPermission: vi.fn(),
  readCompanyResearch: vi.fn(),
  resolveJobRoute: vi.fn(),
  searchConfigured: vi.fn(),
  searchWeb: vi.fn(),
  writeCompanyResearch: vi.fn()
}))

vi.mock("~api/llm", () => ({
  getLLMClient: mocks.getLLMClient
}))

vi.mock("~api/perplexityClient", () => ({
  PerplexityClient: class {
    fetchCompanyInfo(company: string) {
      return mocks.fetchCompanyInfo(company)
    }
  }
}))

vi.mock("~api/searchClient", () => ({
  searchConfigured: mocks.searchConfigured,
  searchWeb: mocks.searchWeb
}))

vi.mock("~background/prepareGenerateRequest", () => ({
  resolveJobRoute: mocks.resolveJobRoute
}))

vi.mock("~lib/hostPermissions", () => ({
  hasHostPermission: mocks.hasHostPermission
}))

vi.mock("~lib/interviews/companyResearch", () => ({
  companyInfoToMarkdown: mocks.companyInfoToMarkdown,
  readCompanyResearch: mocks.readCompanyResearch,
  writeCompanyResearch: mocks.writeCompanyResearch
}))

vi.mock("~lib/interviews/companySite", () => ({
  companyOriginFrom: (url?: string) => {
    if (!url) return undefined
    try {
      return new URL(url).origin
    } catch {
      return undefined
    }
  },
  fetchCompanyPages: mocks.fetchCompanyPages
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

const companyInfo: CompanyInfo = {
  industry: "Software",
  size: "500 employees",
  description: "Builds useful tools",
  notableProjects: ["Platform"],
  ratings: {},
  sources: []
}

const routing = (research: ModelRouting["research"]): ModelRouting => ({
  scoring: { provider: "openai", model: "scoring-model" },
  drafting: { provider: "openai", model: "drafting-model" },
  prep: { provider: "openai", model: "prep-model" },
  research,
  fallback: {
    enabled: false,
    target: { provider: "openai", model: "fallback-model" }
  }
})

let storedRouting: ModelRouting | undefined
let perplexityConfig: unknown
let searchConfig: unknown

async function invoke(body?: unknown): Promise<ReturnType<typeof vi.fn>> {
  const send = vi.fn()
  await generateCompanyResearch({ body } as any, { send } as any)
  return send
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"))
  storedRouting = routing("auto")
  perplexityConfig = undefined
  searchConfig = undefined

  mocks.companyInfoToMarkdown.mockImplementation((info: CompanyInfo) =>
    info.description === "Not available"
      ? ""
      : "## Company\nBuilds useful tools"
  )
  mocks.getLLMClient.mockReturnValue({ chat: mocks.chat })
  mocks.hasHostPermission.mockResolvedValue(false)
  mocks.readCompanyResearch.mockResolvedValue(undefined)
  mocks.resolveJobRoute.mockResolvedValue({ primary })
  mocks.searchConfigured.mockImplementation(
    (config: { enabled?: boolean; apiKey?: string } | undefined) =>
      !!config?.enabled && !!config.apiKey
  )
  mocks.writeCompanyResearch.mockResolvedValue(undefined)

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn().mockImplementation((keys: string | string[]) => {
          if (keys === "modelRouting") return { modelRouting: storedRouting }
          if (keys === "llmTuning") return {}
          if (Array.isArray(keys)) {
            return { perplexityConfig, searchConfig }
          }
          return {}
        })
      }
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("generateCompanyResearch message", () => {
  it("rejects a blank company before reading storage", async () => {
    const send = await invoke({ company: "   " })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message: "No company given."
    })
    expect(chrome.storage.local.get).not.toHaveBeenCalled()
  })

  it("returns a matching cached entry without contacting sources", async () => {
    const cached = {
      text: "Cached research",
      generatedAt: "2026-09-01T00:00:00.000Z",
      source: "search" as const
    }
    mocks.readCompanyResearch.mockResolvedValue(cached)

    const send = await invoke({ company: " Acme " })

    expect(mocks.readCompanyResearch).toHaveBeenCalledWith("Acme")
    expect(send).toHaveBeenCalledWith({
      success: true,
      cached: true,
      entry: cached
    })
    expect(mocks.fetchCompanyInfo).not.toHaveBeenCalled()
  })

  it("ignores a cache entry from a source excluded by pinned routing", async () => {
    storedRouting = routing("search")
    mocks.readCompanyResearch.mockResolvedValue({
      text: "Old model research",
      generatedAt: "2026-09-01T00:00:00.000Z",
      source: "model"
    })

    const send = await invoke({ company: "Acme" })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message:
        "Company research is set to Web search only on the Model routing page, and that failed. Web search: not connected",
      needsHostPermission: undefined
    })
  })

  it("stores a successful Perplexity result with provenance", async () => {
    perplexityConfig = {
      enabled: true,
      apiKey: "perplexity-key",
      customPrompt: "Research {{companyName}}"
    }
    mocks.fetchCompanyInfo.mockResolvedValue(companyInfo)

    const send = await invoke({ company: "Acme", force: true })

    const entry = {
      text: "## Company\nBuilds useful tools",
      parsed: companyInfo,
      generatedAt: "2026-09-22T12:00:00.000Z",
      source: "perplexity",
      sourceUrls: []
    }
    expect(mocks.fetchCompanyInfo).toHaveBeenCalledWith("Acme")
    expect(mocks.writeCompanyResearch).toHaveBeenCalledWith("Acme", entry)
    expect(send).toHaveBeenCalledWith({
      success: true,
      cached: false,
      entry,
      needsHostPermission: undefined
    })
  })

  it("falls through from Perplexity to search and synthesizes grounded results", async () => {
    perplexityConfig = {
      enabled: true,
      apiKey: "bad-key",
      customPrompt: "Research {{companyName}}"
    }
    searchConfig = {
      enabled: true,
      apiKey: "search-key",
      engine: "tavily"
    }
    mocks.fetchCompanyInfo.mockRejectedValue(new Error("unauthorized"))
    mocks.searchWeb.mockResolvedValue([
      {
        title: "About Acme",
        url: "https://acme.test/about",
        snippet: "Acme builds useful tools."
      }
    ])
    mocks.chat.mockResolvedValue(JSON.stringify(companyInfo))

    const send = await invoke({ company: "Acme" })

    expect(mocks.searchWeb).toHaveBeenCalledWith(
      searchConfig,
      "Acme company — what they do, products, size, industry",
      6
    )
    expect(mocks.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "primary-model",
        temperature: 0.4,
        topP: 0.9,
        maxTokens: 900,
        signal: expect.any(AbortSignal)
      })
    )
    expect(mocks.writeCompanyResearch).toHaveBeenCalledWith(
      "Acme",
      expect.objectContaining({
        source: "search",
        sourceUrls: ["https://acme.test/about"]
      })
    )
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, cached: false })
    )
  })

  it("retries synthesis using the configured fallback route", async () => {
    storedRouting = routing("model")
    mocks.resolveJobRoute.mockResolvedValue({ primary, fallback })
    mocks.chat
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce(JSON.stringify(companyInfo))

    const send = await invoke({ company: "Acme", force: true })

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
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it("reports the origin needed for pinned company-site research", async () => {
    storedRouting = routing("site")

    const send = await invoke({
      company: "Acme",
      jobUrl: "https://jobs.acme.test/opening"
    })

    expect(mocks.hasHostPermission).toHaveBeenCalledWith(
      "https://jobs.acme.test"
    )
    expect(send).toHaveBeenCalledWith({
      success: false,
      message:
        "Company research is set to The company's own site only on the Model routing page, and that failed. https://jobs.acme.test: not allowed yet",
      needsHostPermission: "https://jobs.acme.test"
    })
  })

  it("returns route setup errors as research failures", async () => {
    storedRouting = routing("model")
    mocks.resolveJobRoute.mockResolvedValue({ error: "No prep provider" })

    const send = await invoke({ company: "Acme", force: true })

    expect(send).toHaveBeenCalledWith({
      success: false,
      message:
        "Company research is set to Model knowledge only — not verified against the web on the Model routing page, and that failed. Model knowledge: No prep provider",
      needsHostPermission: undefined
    })
  })
})

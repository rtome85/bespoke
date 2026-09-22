import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SearchConfig } from "~types/config"

import {
  searchConfigured,
  searchEngineName,
  searchWeb,
  testSearchConnection
} from "./searchClient"

const fetchMock = vi.fn()

const config = (engine: SearchConfig["engine"]): SearchConfig => ({
  engine,
  apiKey: "  search-key  ",
  enabled: true
})

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init
  })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("searchConfigured", () => {
  it("requires an enabled engine with a non-blank API key", () => {
    expect(searchConfigured(config("tavily"))).toBe(true)
    expect(searchConfigured({ ...config("tavily"), enabled: false })).toBe(
      false
    )
    expect(searchConfigured({ ...config("tavily"), apiKey: "   " })).toBe(false)
    expect(searchConfigured()).toBe(false)
  })
})

describe("searchWeb", () => {
  it("maps Tavily results, trims fields, and drops unusable records", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: "  Result title  ",
            url: " https://example.test/result ",
            content: "  Useful excerpt  "
          },
          { title: "No URL", content: "ignored" },
          { url: "https://example.test/empty" }
        ]
      })
    )

    await expect(searchWeb(config("tavily"), "query", 4)).resolves.toEqual([
      {
        title: "Result title",
        url: "https://example.test/result",
        snippet: "Useful excerpt"
      }
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.tavily.com/search")
    expect(init.headers.Authorization).toBe("Bearer search-key")
    expect(JSON.parse(init.body)).toEqual({
      query: "query",
      max_results: 4,
      search_depth: "basic"
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("maps Brave snippets and URL-encodes the query", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        web: {
          results: [
            {
              title: "Brave result",
              url: "https://example.test/brave",
              description: "Main",
              extra_snippets: ["Extra one", "Extra two"]
            }
          ]
        }
      })
    )

    await expect(searchWeb(config("brave"), "C++ jobs", 2)).resolves.toEqual([
      {
        title: "Brave result",
        url: "https://example.test/brave",
        snippet: "Main Extra one Extra two"
      }
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://api.search.brave.com/res/v1/web/search?q=C%2B%2B%20jobs&count=2"
    )
    expect(init.method).toBe("GET")
    expect(init.headers["X-Subscription-Token"]).toBe("search-key")
  })

  it("maps Exa text and caps long snippets", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            title: "Exa result",
            url: "https://example.test/exa",
            text: `  ${"x".repeat(1_300)}  `
          }
        ]
      })
    )

    const [result] = await searchWeb(config("exa"), "query", 3)
    expect(result.snippet).toHaveLength(1_200)
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers["x-api-key"]).toBe("search-key")
    expect(JSON.parse(init.body)).toEqual({
      query: "query",
      numResults: 3,
      contents: { text: { maxCharacters: 1200 } }
    })
  })

  it("forwards caller cancellation to the request-owned abort signal", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"))
          })
        })
    )
    const controller = new AbortController()

    const pending = searchWeb(config("tavily"), "query", 1, controller.signal)
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: "AbortError" })
  })

  it("reports engine status and a bounded response excerpt", async () => {
    fetchMock.mockResolvedValue(
      new Response("x".repeat(250), {
        status: 401,
        statusText: "Unauthorized"
      })
    )

    await expect(searchWeb(config("exa"), "query")).rejects.toThrow(
      `Exa API error: 401 Unauthorized — ${"x".repeat(200)}`
    )
  })
})

describe("search helpers", () => {
  it("tests a connection with the cheapest one-result search", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }))

    await expect(testSearchConnection(config("tavily"))).resolves.toBe(true)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toMatchObject({
      query: "Bespoke connection test",
      max_results: 1
    })
  })

  it("returns the display name for every search engine", () => {
    expect(searchEngineName("tavily")).toBe("Tavily")
    expect(searchEngineName("brave")).toBe("Brave Search")
    expect(searchEngineName("exa")).toBe("Exa")
  })
})

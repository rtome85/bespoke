import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PerplexityConfig } from "~types/config"

import { PerplexityClient } from "./perplexityClient"

const fetchMock = vi.fn()

const config: PerplexityConfig = {
  apiKey: "perplexity-key",
  enabled: true,
  customPrompt: "Research {{companyName}} and compare {{companyName}}."
}

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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("PerplexityClient.testConnection", () => {
  it("sends a minimal authenticated request", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))

    await expect(new PerplexityClient(config).testConnection()).resolves.toBe(
      true
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.perplexity.ai/chat/completions")
    expect(init.headers.Authorization).toBe("Bearer perplexity-key")
    expect(JSON.parse(init.body)).toMatchObject({
      model: "sonar",
      max_tokens: 20
    })
  })

  it("returns false when the request throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockRejectedValue(new Error("offline"))

    await expect(new PerplexityClient(config).testConnection()).resolves.toBe(
      false
    )
  })
})

describe("PerplexityClient.fetchCompanyInfo", () => {
  it("replaces every company placeholder, forwards cancellation, and parses the response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: "A useful company",
                industry: "Software"
              })
            }
          }
        ]
      })
    )
    const controller = new AbortController()

    const result = await new PerplexityClient(config).fetchCompanyInfo(
      "Acme & Co",
      controller.signal
    )

    expect(result).toMatchObject({
      description: "A useful company",
      industry: "Software"
    })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBe(controller.signal)
    expect(init.headers.Authorization).toBe("Bearer perplexity-key")
    expect(JSON.parse(init.body)).toMatchObject({
      model: "sonar",
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        expect.any(Object),
        {
          role: "user",
          content: "Research Acme & Co and compare Acme & Co."
        }
      ]
    })
  })

  it("reports status and a bounded error response excerpt", async () => {
    fetchMock.mockResolvedValue(
      new Response("x".repeat(250), {
        status: 429,
        statusText: "Too Many Requests"
      })
    )

    await expect(
      new PerplexityClient(config).fetchCompanyInfo("Acme")
    ).rejects.toThrow(
      `Perplexity API error: 429 Too Many Requests — ${"x".repeat(200)}`
    )
  })

  it("rejects empty successful responses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "   " } }] })
    )

    await expect(
      new PerplexityClient(config).fetchCompanyInfo("Acme")
    ).rejects.toThrow("Perplexity returned an empty response.")
  })
})

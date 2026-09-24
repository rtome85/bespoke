import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PROVIDER_META } from "~constants/providers"

import { AnthropicAdapter } from "./anthropic"
import { GoogleAdapter } from "./google"
import { getLLMClient } from "./index"
import { estimateNumCtx, OllamaAdapter } from "./ollama"
import { OpenAIAdapter } from "./openai"
import { splitSystem, type ChatOptions } from "./types"

const fetchMock = vi.fn()

const chatOptions = (signal?: AbortSignal): ChatOptions => ({
  model: "test/model",
  messages: [
    { role: "system", content: "First system rule" },
    { role: "user", content: "First question" },
    { role: "system", content: "Second system rule" },
    { role: "user", content: "Second question" }
  ],
  temperature: 0.3,
  topP: 0.8,
  maxTokens: 321,
  signal
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

describe("splitSystem", () => {
  it("joins system and user messages into their provider-specific channels", () => {
    expect(splitSystem(chatOptions().messages)).toEqual({
      system: "First system rule\n\nSecond system rule",
      user: "First question\n\nSecond question"
    })
  })
})

describe("getLLMClient", () => {
  it.each([
    ["openai", OpenAIAdapter],
    ["openrouter", OpenAIAdapter],
    ["deepseek", OpenAIAdapter],
    ["mistral", OpenAIAdapter],
    ["custom", OpenAIAdapter],
    ["anthropic", AnthropicAdapter],
    ["google", GoogleAdapter],
    ["ollama", OllamaAdapter]
  ] as const)("constructs the %s adapter", (provider, Adapter) => {
    expect(
      getLLMClient(provider, {
        apiKey: "secret",
        baseUrl: "https://example.test"
      })
    ).toBeInstanceOf(Adapter)
  })
})

describe("OpenAIAdapter", () => {
  it("uses the OpenAI token field and forwards the abort signal", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "answer" } }] })
    )
    const controller = new AbortController()
    const client = new OpenAIAdapter("secret", "https://openai.example/v1/")

    await expect(client.chat(chatOptions(controller.signal))).resolves.toBe(
      "answer"
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://openai.example/v1/chat/completions")
    expect(init.headers).toEqual({
      Authorization: "Bearer secret",
      "Content-Type": "application/json"
    })
    expect(init.signal).toBe(controller.signal)
    expect(JSON.parse(init.body)).toMatchObject({
      model: "test/model",
      max_completion_tokens: 321,
      temperature: 0.3,
      top_p: 0.8
    })
    expect(JSON.parse(init.body)).not.toHaveProperty("max_tokens")
  })

  it("uses the compatible token field and omits an empty authorization header", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [] }))
    const client = new OpenAIAdapter("", "https://custom.example/v1", "custom")

    await expect(client.chat(chatOptions())).resolves.toBe("")
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers).toEqual({ "Content-Type": "application/json" })
    expect(JSON.parse(init.body)).toMatchObject({ max_tokens: 321 })
    expect(JSON.parse(init.body)).not.toHaveProperty("max_completion_tokens")
  })

  it("reports the provider status and a bounded response excerpt", async () => {
    fetchMock.mockResolvedValue(
      new Response("x".repeat(250), {
        status: 429,
        statusText: "Too Many Requests"
      })
    )
    const client = new OpenAIAdapter(
      "secret",
      "https://api.example/v1",
      "deepseek"
    )

    await expect(client.chat(chatOptions())).rejects.toThrow(
      `DeepSeek API error: 429 Too Many Requests — ${"x".repeat(200)}`
    )
  })

  it("filters non-chat OpenAI models", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { id: "gpt-4o" },
          { id: "o4-mini" },
          { id: "text-embedding-3-small" },
          { id: "dall-e-3" },
          { id: 42 },
          { id: "unrelated-model" }
        ]
      })
    )

    await expect(new OpenAIAdapter("secret").listModels()).resolves.toEqual([
      "gpt-4o",
      "o4-mini"
    ])
  })

  it("returns fallback models when model discovery fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"))

    await expect(new OpenAIAdapter("secret").listModels()).resolves.toEqual(
      PROVIDER_META.openai.fallbackModels
    )
  })

  it("uses OpenRouter's authenticated key endpoint for connection tests", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    const client = new OpenAIAdapter(
      "secret",
      "https://openrouter.example/api/v1/",
      "openrouter"
    )

    await expect(client.testConnection()).resolves.toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://openrouter.example/api/v1/key"
    )
  })
})

describe("AnthropicAdapter", () => {
  it("uses top-level system instructions and joins text response blocks", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        content: [
          { type: "text", text: "first" },
          { type: "tool_use", name: "ignored" },
          { type: "text", text: " second" }
        ]
      })
    )
    const controller = new AbortController()
    const client = new AnthropicAdapter(
      "anthropic-key",
      "https://anthropic.example/v1/"
    )

    await expect(client.chat(chatOptions(controller.signal))).resolves.toBe(
      "first second"
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://anthropic.example/v1/messages")
    expect(init.headers).toMatchObject({
      "x-api-key": "anthropic-key",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    })
    expect(init.signal).toBe(controller.signal)
    expect(JSON.parse(init.body)).toEqual({
      model: "test/model",
      system: "First system rule\n\nSecond system rule",
      messages: [
        {
          role: "user",
          content: "First question\n\nSecond question"
        }
      ],
      max_tokens: 321,
      temperature: 0.3,
      top_p: 0.8
    })
  })

  it("ignores malformed model identifiers returned by the API", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [{ id: "claude-sonnet" }, { id: 42 }, { id: null }, {}]
      })
    )

    await expect(new AnthropicAdapter("secret").listModels()).resolves.toEqual([
      "claude-sonnet"
    ])
  })

  it("falls back when model discovery returns an error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }))

    await expect(new AnthropicAdapter("secret").listModels()).resolves.toEqual(
      PROVIDER_META.anthropic.fallbackModels
    )
  })
})

describe("GoogleAdapter", () => {
  it("encodes the model and key and maps the Gemini request and response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: "first" }, { text: " second" }] } }
        ]
      })
    )
    const controller = new AbortController()
    const client = new GoogleAdapter(
      "key with spaces",
      "https://google.example/v1beta/"
    )

    await expect(client.chat(chatOptions(controller.signal))).resolves.toBe(
      "first second"
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://google.example/v1beta/models/test%2Fmodel:generateContent?key=key%20with%20spaces"
    )
    expect(init.signal).toBe(controller.signal)
    expect(JSON.parse(init.body)).toEqual({
      contents: [
        {
          role: "user",
          parts: [{ text: "First question\n\nSecond question" }]
        }
      ],
      systemInstruction: {
        parts: [{ text: "First system rule\n\nSecond system rule" }]
      },
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 321
      }
    })
  })

  it("keeps only Gemini models that support content generation", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        models: [
          {
            name: "models/gemini-flash",
            supportedGenerationMethods: ["generateContent"]
          },
          {
            name: "models/gemini-embedding",
            supportedGenerationMethods: ["embedContent"]
          },
          { name: "models/text-bison" }
        ]
      })
    )

    await expect(new GoogleAdapter("secret").listModels()).resolves.toEqual([
      "gemini-flash"
    ])
  })

  it("returns false when its connection request fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"))

    await expect(new GoogleAdapter("secret").testConnection()).resolves.toBe(
      false
    )
  })
})

describe("OllamaAdapter", () => {
  it("maps chat requests and includes authorization only when configured", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: { content: "local answer" } })
    )
    const controller = new AbortController()
    const client = new OllamaAdapter(
      "ollama-key",
      "https://ollama.example/api/"
    )

    await expect(client.chat(chatOptions(controller.signal))).resolves.toBe(
      "local answer"
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://ollama.example/api/chat")
    expect(init.headers).toEqual({
      Authorization: "Bearer ollama-key",
      "Content-Type": "application/json"
    })
    expect(init.signal).toBe(controller.signal)
    expect(JSON.parse(init.body)).toMatchObject({
      model: "test/model",
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.8,
        num_predict: 321,
        num_ctx: 8_192
      }
    })
    expect(JSON.parse(init.body)).not.toHaveProperty("max_tokens")
  })

  it("sizes num_ctx to the prompt, rounded to a power of two and capped", () => {
    const withPrompt = (chars: number, maxTokens = 4_096) => ({
      ...chatOptions(),
      messages: [{ role: "user" as const, content: "x".repeat(chars) }],
      maxTokens
    })

    expect(estimateNumCtx(withPrompt(3_000))).toBe(8_192)
    expect(estimateNumCtx(withPrompt(30_000))).toBe(16_384)
    expect(estimateNumCtx(withPrompt(60_000))).toBe(32_768)
    expect(estimateNumCtx(withPrompt(1_000_000))).toBe(32_768)
  })

  it("returns only string model names", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        models: [{ name: "llama3" }, { name: 42 }, { name: "qwen3" }, {}]
      })
    )

    await expect(
      new OllamaAdapter("", "http://localhost:11434").listModels()
    ).resolves.toEqual(["llama3", "qwen3"])
  })

  it("returns fallback models when model discovery fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"))

    await expect(
      new OllamaAdapter("", "http://localhost:11434").listModels()
    ).resolves.toEqual(PROVIDER_META.ollama.fallbackModels)
  })

  it("includes a bounded response excerpt in chat errors", async () => {
    fetchMock.mockResolvedValue(
      new Response("bad model", { status: 404, statusText: "Not Found" })
    )

    await expect(
      new OllamaAdapter("", "http://localhost:11434").chat(chatOptions())
    ).rejects.toThrow("Ollama API error: 404 Not Found — bad model")
  })
})

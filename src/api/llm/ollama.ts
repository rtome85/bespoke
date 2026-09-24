import { PROVIDER_META } from "~constants/providers"

import type { ChatOptions, LLMClient } from "./types"

interface OllamaChatResponse {
  message?: { content?: string }
}

interface OllamaTagsResponse {
  models?: { name?: string }[]
}

// Ollama's default context window is small and silently truncates long
// prompts, so size it per request. Rounding to a power of two keeps the
// value stable across similar requests — a changed num_ctx forces a reload.
const MIN_NUM_CTX = 8_192
const MAX_NUM_CTX = 32_768
const CHARS_PER_TOKEN = 3

export function estimateNumCtx(opts: ChatOptions): number {
  const promptChars = opts.messages.reduce((n, m) => n + m.content.length, 0)
  const needed = Math.ceil(promptChars / CHARS_PER_TOKEN) + opts.maxTokens
  let ctx = MIN_NUM_CTX
  while (ctx < needed && ctx < MAX_NUM_CTX) ctx *= 2
  return ctx
}

/**
 * Ollama — both the local server and the hosted cloud API speak the same
 * `/chat` shape used here.
 */
export class OllamaAdapter implements LLMClient {
  private base: string

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.base = (baseUrl || PROVIDER_META.ollama.defaultBaseUrl || "").replace(
      /\/$/,
      ""
    )
  }

  private headers() {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) h.Authorization = `Bearer ${this.apiKey}`
    return h
  }

  async chat(opts: ChatOptions): Promise<string> {
    const res = await fetch(`${this.base}/chat`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: false,
        // The native /api/chat only reads sampling parameters from `options`.
        options: {
          temperature: opts.temperature,
          top_p: opts.topP,
          num_predict: opts.maxTokens,
          num_ctx: estimateNumCtx(opts)
        }
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `Ollama API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }
    const data = (await res.json()) as OllamaChatResponse
    const content = data?.message?.content
    return typeof content === "string" ? content : ""
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.base}/tags`, { headers: this.headers() })
      if (!res.ok) return PROVIDER_META.ollama.fallbackModels
      const data = (await res.json()) as OllamaTagsResponse
      const models = Array.isArray(data?.models) ? data.models : []
      const ids = models
        .map((m) => m?.name)
        .filter((id: unknown): id is string => typeof id === "string")
      return ids.length ? ids : PROVIDER_META.ollama.fallbackModels
    } catch {
      return PROVIDER_META.ollama.fallbackModels
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/tags`, { headers: this.headers() })
      return res.ok
    } catch {
      return false
    }
  }
}

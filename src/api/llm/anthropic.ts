import { PROVIDER_META } from "~types/config"

import { splitSystem, type ChatOptions, type LLMClient } from "./types"

const ANTHROPIC_VERSION = "2023-06-01"

/** Anthropic Messages API. `system` is a top-level field, not a message. */
export class AnthropicAdapter implements LLMClient {
  private base: string

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.base = (
      baseUrl ||
      PROVIDER_META.anthropic.defaultBaseUrl ||
      ""
    ).replace(/\/$/, "")
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      // Required for calls that originate from a browser/extension context.
      "anthropic-dangerous-direct-browser-access": "true"
    }
  }

  async chat(opts: ChatOptions): Promise<string> {
    const { system, user } = splitSystem(opts.messages)
    const res = await fetch(`${this.base}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts.model,
        system: system || undefined,
        messages: [{ role: "user", content: user }],
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        top_p: opts.topP
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `Anthropic API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }
    const data = await res.json()
    const parts = Array.isArray(data?.content) ? data.content : []
    return parts
      .filter((p: any) => p?.type === "text")
      .map((p: any) => p.text)
      .join("")
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.base}/models`, { headers: this.headers() })
      if (!res.ok) return PROVIDER_META.anthropic.fallbackModels
      const data = await res.json()
      const ids = (Array.isArray(data?.data) ? data.data : [])
        .map((m: any) => m?.id)
        .filter(Boolean)
      return ids.length ? ids : PROVIDER_META.anthropic.fallbackModels
    } catch {
      return PROVIDER_META.anthropic.fallbackModels
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/models`, { headers: this.headers() })
      return res.ok
    } catch {
      return false
    }
  }
}

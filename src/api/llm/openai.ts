import { PROVIDER_META } from "~types/config"

import type { ChatOptions, LLMClient } from "./types"

/** OpenAI Chat Completions. */
export class OpenAIAdapter implements LLMClient {
  private base: string

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.base = (baseUrl || PROVIDER_META.openai.defaultBaseUrl || "").replace(
      /\/$/,
      ""
    )
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    }
  }

  async chat(opts: ChatOptions): Promise<string> {
    const res = await fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature,
        top_p: opts.topP,
        max_completion_tokens: opts.maxTokens
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `OpenAI API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ""
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.base}/models`, { headers: this.headers() })
      if (!res.ok) return PROVIDER_META.openai.fallbackModels
      const data = await res.json()
      const ids = (Array.isArray(data?.data) ? data.data : [])
        .map((m: any) => m?.id)
        .filter(
          (id: string) =>
            typeof id === "string" && (id.startsWith("gpt-") || id.startsWith("o"))
        )
      return ids.length ? ids : PROVIDER_META.openai.fallbackModels
    } catch {
      return PROVIDER_META.openai.fallbackModels
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

import { PROVIDER_META, type LLMProviderId } from "~types/config"

import type { ChatOptions, LLMClient } from "./types"

/** Providers served by the OpenAI Chat Completions wire format. */
export type OpenAICompatibleId = Extract<
  LLMProviderId,
  "openai" | "openrouter" | "deepseek" | "mistral" | "custom"
>

const NON_CHAT_MODEL = /embed|moderation|image|imagine|ocr|tts|whisper/i

/**
 * OpenAI Chat Completions, plus the providers that speak the same protocol.
 * They differ only in a few details, all keyed off `provider` below.
 */
export class OpenAIAdapter implements LLMClient {
  private base: string

  constructor(
    private apiKey: string,
    baseUrl?: string,
    private provider: OpenAICompatibleId = "openai"
  ) {
    this.base = (
      baseUrl ||
      PROVIDER_META[provider].defaultBaseUrl ||
      ""
    ).replace(/\/$/, "")
  }

  private get meta() {
    return PROVIDER_META[this.provider]
  }

  private headers(): Record<string, string> {
    // Self-hosted endpoints often run keyless; an empty bearer token is
    // rejected by some of them, so omit the header instead.
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
    }
  }

  async chat(opts: ChatOptions): Promise<string> {
    // OpenAI deprecated `max_tokens` for `max_completion_tokens`; the
    // compatible APIs (and vLLM / LM Studio / LiteLLM) still expect the
    // original name.
    const tokenLimit =
      this.provider === "openai"
        ? { max_completion_tokens: opts.maxTokens }
        : { max_tokens: opts.maxTokens }
    const res = await fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature,
        top_p: opts.topP,
        ...tokenLimit
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `${this.meta.name} API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ""
  }

  async listModels(): Promise<string[]> {
    const { fallbackModels } = this.meta
    try {
      const res = await fetch(`${this.base}/models`, {
        headers: this.headers()
      })
      if (!res.ok) return fallbackModels
      const data = await res.json()
      const ids = (Array.isArray(data?.data) ? data.data : [])
        .map((m: any) => m?.id)
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" &&
            // Lists mix in embedding, audio, image and OCR models that can't
            // serve a chat completion.
            !NON_CHAT_MODEL.test(id) &&
            (this.provider !== "openai" ||
              id.startsWith("gpt-") ||
              id.startsWith("o"))
        )
      return ids.length ? ids : fallbackModels
    } catch {
      return fallbackModels
    }
  }

  async testConnection(): Promise<boolean> {
    // OpenRouter's model list is public, so it would pass with any key;
    // `/key` describes the calling key and 401s on a bad one.
    const path = this.provider === "openrouter" ? "/key" : "/models"
    try {
      const res = await fetch(`${this.base}${path}`, {
        headers: this.headers()
      })
      return res.ok
    } catch {
      return false
    }
  }
}

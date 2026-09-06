import { PROVIDER_META } from "~types/config"

import type { ChatOptions, LLMClient } from "./types"

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
        temperature: opts.temperature,
        top_p: opts.topP,
        max_tokens: opts.maxTokens
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data?.message?.content ?? ""
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.base}/tags`, { headers: this.headers() })
    if (!res.ok) return []
    const data = await res.json()
    const models = Array.isArray(data?.models) ? data.models : []
    return models.map((m: any) => m?.name).filter(Boolean)
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

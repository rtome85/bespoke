import { PROVIDER_META } from "~types/config"

import { splitSystem, type ChatOptions, type LLMClient } from "./types"

/** Google Gemini (Generative Language API). Key goes in the query string. */
export class GoogleAdapter implements LLMClient {
  private base: string

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.base = (baseUrl || PROVIDER_META.google.defaultBaseUrl || "").replace(
      /\/$/,
      ""
    )
  }

  async chat(opts: ChatOptions): Promise<string> {
    const { system, user } = splitSystem(opts.messages)
    const url = `${this.base}/models/${encodeURIComponent(
      opts.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: system
          ? { parts: [{ text: system }] }
          : undefined,
        generationConfig: {
          temperature: opts.temperature,
          topP: opts.topP,
          maxOutputTokens: opts.maxTokens
        }
      }),
      signal: opts.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `Google API error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }
    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    return Array.isArray(parts)
      ? parts.map((p: any) => p?.text ?? "").join("")
      : ""
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(
        `${this.base}/models?key=${encodeURIComponent(this.apiKey)}`
      )
      if (!res.ok) return PROVIDER_META.google.fallbackModels
      const data = await res.json()
      const ids = (Array.isArray(data?.models) ? data.models : [])
        .map((m: any) => String(m?.name ?? "").replace(/^models\//, ""))
        .filter(
          (id: string) =>
            id.startsWith("gemini-") &&
            (data.models.find(
              (m: any) => String(m?.name).endsWith(id)
            )?.supportedGenerationMethods?.includes("generateContent") ??
              true)
        )
      return ids.length ? ids : PROVIDER_META.google.fallbackModels
    } catch {
      return PROVIDER_META.google.fallbackModels
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.base}/models?key=${encodeURIComponent(this.apiKey)}`
      )
      return res.ok
    } catch {
      return false
    }
  }
}

import { PROVIDER_META } from "~constants/providers"

import { splitSystem, type ChatOptions, type LLMClient } from "./types"

interface GoogleGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

interface GoogleModel {
  name?: string
  supportedGenerationMethods?: string[]
}

interface GoogleModelsResponse {
  models?: GoogleModel[]
}

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
    const data = (await res.json()) as GoogleGenerateContentResponse
    const parts = data?.candidates?.[0]?.content?.parts
    return Array.isArray(parts)
      ? parts.map((p) => p?.text ?? "").join("")
      : ""
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(
        `${this.base}/models?key=${encodeURIComponent(this.apiKey)}`
      )
      if (!res.ok) return PROVIDER_META.google.fallbackModels
      const data = (await res.json()) as GoogleModelsResponse
      const models = Array.isArray(data?.models) ? data.models : []
      const ids = models
        .map((m) => String(m?.name ?? "").replace(/^models\//, ""))
        .filter(
          (id: string) =>
            id.startsWith("gemini-") &&
            (models.find(
              (m) => String(m?.name).endsWith(id)
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

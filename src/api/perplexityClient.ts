import { parseCompanyInfo } from "~lib/companyResearchParser"
import type { CompanyInfo } from "~types/companyResearch"
import type { PerplexityConfig } from "~types/config"

export class PerplexityClient {
  private config: PerplexityConfig

  constructor(config: PerplexityConfig) {
    this.config = config
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              {
                role: "user",
                content: "Say 'Connection successful' in one sentence."
              }
            ],
            max_tokens: 20
          })
        }
      )
      return response.ok
    } catch (error) {
      console.error("Perplexity connection test failed:", error)
      return false
    }
  }

  /**
   * Research one company. Throws on a transport, credential or empty-response
   * failure rather than returning a blank `CompanyInfo` — the research chain
   * needs to tell "Perplexity rejected the key" from "Perplexity found
   * nothing" so it can fall through to the next source.
   */
  async fetchCompanyInfo(
    companyName: string,
    signal?: AbortSignal
  ): Promise<CompanyInfo> {
    const prompt = this.config.customPrompt.replace(
      /\{\{companyName\}\}/g,
      companyName
    )

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You are a company research assistant. Provide accurate, concise information about companies based on your web search capabilities."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.2
      }),
      signal
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""
    if (!content.trim()) {
      throw new Error("Perplexity returned an empty response.")
    }
    // Shared with the side panel's own research call, so both paths read the
    // same loosely-keyed JSON the model actually returns.
    return parseCompanyInfo(content)
  }
}

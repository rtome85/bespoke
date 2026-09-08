import type { PerplexityConfig } from "~types/config"

export interface CompanyInfo {
  industry: string
  size: string
  description: string
  notableProjects: string[]
  ratings: {
    glassdoor?: number
    indeed?: number
    teamlyzer?: number
  }
  sources: string[]
}

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

  async fetchCompanyInfo(companyName: string): Promise<CompanyInfo> {
    const prompt = this.config.customPrompt.replace(
      /\{\{companyName\}\}/g,
      companyName
    )

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
              {
                role: "system",
                content:
                  "You are a company research assistant. Provide accurate, concise information about companies based on your web search capabilities."
              },
              { role: "user", content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.2
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ""
      const citations = data.choices?.[0]?.citation_tokens || []

      return this.parseCompanyInfo(content)
    } catch (error) {
      console.error("Failed to fetch company info:", error)
      return this.getEmptyCompanyInfo()
    }
  }

  private parseCompanyInfo(content: string): CompanyInfo {
    const lines = content.split("\n").filter((l) => l.trim())

    const industry =
      this.extractField(content, /industry[:\s]*(.+?)(?:\n|$)/i) ||
      "Not available"
    const size =
      this.extractField(content, /(?:company )?size[:\s]*(.+?)(?:\n|$)/i) ||
      "Not available"
    const description =
      this.extractField(content, /description[:\s]*(.+?)(?:\n\n|$)/i) || ""

    const projects: string[] = []
    const projectsMatch = content.match(
      /(?:notable projects|projects|products)[:\s]*(.+?)(?=\n\n|\n[A-Z]|$)/is
    )
    if (projectsMatch) {
      const projectLines = projectsMatch[1].split(/[-•*]/).filter(Boolean)
      projects.push(
        ...projectLines
          .slice(0, 5)
          .map((p) => p.trim())
          .filter(Boolean)
      )
    }

    const ratings = {
      glassdoor: this.extractRating(content, /glassdoor[:\s]*(\d+\.?\d*)/i),
      indeed: this.extractRating(content, /indeed[:\s]*(\d+\.?\d*)/i),
      teamlyzer: this.extractRating(content, /teamlyzer[:\s]*(\d+\.?\d*)/i)
    }

    return {
      industry,
      size,
      description,
      notableProjects: projects,
      ratings,
      sources: []
    }
  }

  private extractField(content: string, regex: RegExp): string | undefined {
    const match = content.match(regex)
    return match?.[1]?.trim()
  }

  private extractRating(content: string, regex: RegExp): number | undefined {
    const match = content.match(regex)
    if (match) {
      const rating = parseFloat(match[1])
      return rating >= 0 && rating <= 5 ? rating : undefined
    }
    return undefined
  }

  private getEmptyCompanyInfo(): CompanyInfo {
    return {
      industry: "Not available",
      size: "Not available",
      description: "",
      notableProjects: [],
      ratings: {},
      sources: []
    }
  }
}

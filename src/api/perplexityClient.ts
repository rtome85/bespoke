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

  async generateInterviewPrepPlan(
    companyName: string,
    jobTitle: string,
    jobDescription: string,
    interviewType: string
  ): Promise<string> {
    const prompt = this.buildInterviewPrepPrompt(
      companyName,
      jobTitle,
      jobDescription,
      interviewType
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
                  "You are a technical interview preparation assistant. Create focused technical interview preparation materials. Always respond in English."
              },
              { role: "user", content: prompt }
            ],
            max_tokens: 2000,
            temperature: 0.3
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ""

      return content
    } catch (error) {
      console.error("Failed to generate interview preparation plan:", error)
      throw error
    }
  }

  private buildInterviewPrepPrompt(
    companyName: string,
    jobTitle: string,
    jobDescription: string,
    interviewType: string
  ): string {
    return `Create a focused technical interview preparation guide for a ${interviewType} for the ${jobTitle} position at ${companyName}.

Job description for context:
${jobDescription || "Not available"}

Generate a technical preparation document in Markdown format with the following structure:

# Technical Interview Preparation - ${jobTitle}

## 1. Key Technologies & Skills
List the main technologies, frameworks, and tools mentioned in the job description that will likely be covered in the interview. Include expected proficiency levels.

## 2. Technical Questions
Prepare 8-12 specific technical questions covering:
- Core programming concepts relevant to the role
- Framework-specific questions (based on technologies in the job description)
- System design and architecture (for senior roles)
- Database and data structure questions
- Problem-solving scenarios with expected solution approaches
- Code review and debugging scenarios

For each question, provide:
- The question itself
- Key points the interviewer expects in the answer
- Example answer outline or code snippet where applicable

## 3. Coding Challenges
List 3-5 practical coding problems or algorithms commonly asked for this type of role, including:
- Problem statement
- Expected time/space complexity
- Hints for approaching the solution

## 4. Technical Deep Dive Topics
Identify 2-3 advanced topics specific to ${companyName}'s tech stack or industry that might be discussed. Provide key concepts to review.

IMPORTANT: Respond ONLY with the Markdown content. No introductory text, no explanations outside the document. Focus strictly on technical preparation content.`
  }
}

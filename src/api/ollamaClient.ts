import type {
  CustomPrompts,
  GenerateRequest,
  OllamaConfig
} from "~types/config"
import type { UserProfile } from "~types/userProfile"

export type { GenerateRequest }

export class OllamaClient {
  private config: OllamaConfig

  constructor(config: OllamaConfig) {
    this.config = config
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        }
      })
      return response.ok
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }

  protected formatUserProfile(profile: UserProfile, includeYears = false): string {
    if (!profile) return ""

    const p = profile.personalInfo
    const contactParts: string[] = []
    if (p?.fullName) contactParts.push(`Name: ${p.fullName}`)
    if (p?.email) contactParts.push(`Email: ${p.email}`)
    if (p?.phone) contactParts.push(`Phone: ${p.phone}`)
    if (p?.location) contactParts.push(`Location: ${p.location}`)
    if (p?.website) contactParts.push(`Website: ${p.website}`)
    if (p?.linkedin) contactParts.push(`LinkedIn: ${p.linkedin}`)
    if (p?.github) contactParts.push(`GitHub: ${p.github}`)
    const personalInfo = contactParts.length > 0
      ? `**Personal Information:**\n${contactParts.join("\n")}${p?.summary ? `\n\nSummary: ${p.summary}` : ""}`
      : ""

    const education =
      (profile.education?.length ?? 0) > 0
        ? `**Education:**\n${profile.education
            .map((e) => {
              const dates = e.endDate ? `${e.startDate} – ${e.endDate}` : `${e.startDate} – Present`
              const field = e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""
              return `- ${e.degree}${field} at ${e.institution} (${dates})`
            })
            .join("\n")}`
        : ""

    const skills =
      (profile.skills?.length ?? 0) > 0
        ? profile.skills
            .map((s) => includeYears ? `- ${s.name} (${s.yearsOfExperience} years)` : `- ${s.name}`)
            .join("\n")
        : "No skills specified"

    const experience =
      (profile.workExperience?.length ?? 0) > 0
        ? profile.workExperience
            .map((exp) => {
              const dateRange = exp.endDate
                ? `${exp.startDate} - ${exp.endDate}`
                : `${exp.startDate} - Present`
              const achievements =
                (exp.achievements?.length ?? 0) > 0
                  ? exp.achievements.map((a) => `  - ${a}`).join("\n")
                  : "  - No achievements specified"
              return `**${exp.jobTitle}** at ${exp.company} (${dateRange})\n${achievements}`
            })
            .join("\n\n")
        : "No work experience specified"

    const projects =
      (profile.personalProjects?.length ?? 0) > 0
        ? profile.personalProjects
            .map((project) => {
              const links = []
              if (project.liveDemoUrl)
                links.push(`Demo: ${project.liveDemoUrl}`)
              if (project.githubRepoUrl)
                links.push(`GitHub: ${project.githubRepoUrl}`)
              const linkStr =
                links.length > 0 ? `\n  ${links.join("\n  ")}` : ""
              return `**${project.title}**\n  ${project.description}${linkStr}`
            })
            .join("\n\n")
        : "No personal projects specified"

    const languages =
      (profile.languages?.length ?? 0) > 0
        ? `**Languages:**\n${profile.languages.map((l) => `- ${l.name}: ${l.level}`).join("\n")}`
        : ""

    return [personalInfo, education, `**Skills:**\n${skills}`, `**Work Experience:**\n${experience}`, `**Personal Projects:**\n${projects}`, languages]
      .filter(Boolean)
      .join("\n\n")
  }

  private interpolatePrompt(
    template: string,
    companyName: string,
    jobTitle: string,
    jobDescription: string,
    userProfile?: UserProfile
  ): string {
    let result = template
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{jobTitle\}\}/g, jobTitle)
      .replace(/\{\{jobDescription\}\}/g, jobDescription)

    if (userProfile) {
      const profileMarkdown = this.formatUserProfile(userProfile)
      result = result.replace(/\{\{userProfile\}\}/g, profileMarkdown)
    }

    return result
  }

  async generate(request: GenerateRequest): Promise<string> {
    const {
      jobDescription,
      companyName,
      jobTitle,
      model,
      prompts,
      userProfile
    } = request

    const interpolatedUserPrompt = this.interpolatePrompt(
      prompts.resumeUserPromptTemplate,
      companyName,
      jobTitle,
      jobDescription,
      userProfile
    )

    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompts.resumeSystemPrompt },
          { role: "user", content: interpolatedUserPrompt }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.message?.content || "No content generated"
  }

  async generateCoverLetter(request: GenerateRequest): Promise<string> {
    const {
      jobDescription,
      companyName,
      jobTitle,
      model,
      prompts,
      userProfile
    } = request

    const interpolatedUserPrompt = this.interpolatePrompt(
      prompts.coverLetterUserPromptTemplate,
      companyName,
      jobTitle,
      jobDescription,
      userProfile
    )

    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompts.coverLetterSystemPrompt },
          { role: "user", content: interpolatedUserPrompt }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.message?.content || "No content generated"
  }

  async generateResumeAndCoverLetter(
    request: GenerateRequest
  ): Promise<{ resume: string; coverLetter: string }> {
    const [resume, coverLetter] = await Promise.all([
      this.generate(request),
      this.generateCoverLetter(request)
    ])
    return { resume, coverLetter }
  }

  async analyzeMatch(
    request: GenerateRequest
  ): Promise<{ percentage: number; summary: string }> {
    try {
      const userPrompt = `Analyze the fit between this candidate and the job posting.
Return ONLY a valid JSON object in this exact format: {"percentage": <0-100>, "summary": "<2 concise sentences>"}

Job Title: ${request.jobTitle} at ${request.companyName}
Job Description: ${request.jobDescription.substring(0, 2000)}
Candidate Profile: ${this.formatUserProfile(request.userProfile, true)}`

      const response = await fetch(`${this.config.baseUrl}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            {
              role: "system",
              content:
                "You are a career advisor. Return only valid JSON, no markdown."
            },
            { role: "user", content: userPrompt }
          ],
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.message?.content || "{}"
      const cleaned = content
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim()
      const parsed = JSON.parse(cleaned)

      return {
        percentage: Math.min(100, Math.max(0, Number(parsed.percentage) || 0)),
        summary: String(parsed.summary || "")
      }
    } catch {
      return { percentage: 0, summary: "Match analysis unavailable." }
    }
  }
}

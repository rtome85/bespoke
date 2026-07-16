import type {
  CustomPrompts,
  GenerateRequest,
  LLMTuningConfig,
  OllamaConfig
} from "~types/config"
import { DEFAULT_LLM_TUNING } from "~types/config"
import type { UserProfile } from "~types/userProfile"

export type { GenerateRequest }

export class OllamaClient {
  private config: OllamaConfig

  constructor(config: OllamaConfig) {
    this.config = config
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/tags`, {
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

  protected formatUserProfile(
    profile: UserProfile,
    includeYears = false
  ): string {
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
    const personalInfo =
      contactParts.length > 0
        ? `**Personal Information:**\n${contactParts.join("\n")}${p?.summary ? `\n\nSummary: ${p.summary}` : ""}`
        : ""

    const education =
      (profile.education?.length ?? 0) > 0
        ? `**Education:**\n${profile.education
            .map((e) => {
              const dates = e.endDate
                ? `${e.startDate} – ${e.endDate}`
                : `${e.startDate} – Present`
              const field = e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""
              return `- ${e.degree}${field} at ${e.institution} (${dates})`
            })
            .join("\n")}`
        : ""

    const skills =
      (profile.skills?.length ?? 0) > 0
        ? profile.skills
            .map((s) =>
              includeYears
                ? `- ${s.name} (${s.yearsOfExperience} years)`
                : `- ${s.name}`
            )
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

    return [
      personalInfo,
      education,
      `**Skills:**\n${skills}`,
      `**Work Experience:**\n${experience}`,
      `**Personal Projects:**\n${projects}`,
      languages
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  private tuningInstructions(tuning: LLMTuningConfig): {
    toneInstruction: string
    focusInstruction: string
    strictnessInstruction: string
  } {
    const tone = {
      formal: "Use formal, precise corporate language throughout.",
      professional: "Use professional yet approachable language.",
      conversational:
        "Use warm, engaging language while remaining professional."
    }[tuning.writingTone]

    const focus = {
      skills:
        "Lead with and prominently feature the candidate's technical skills near the top of the resume.",
      experience:
        "Lead with and emphasise Work Experience and concrete achievements above all else.",
      balanced: ""
    }[tuning.resumeFocus]

    const strictness = {
      strict:
        "Be rigorous and critical. Weight missing skills and experience gaps heavily in your assessment. Scores below 50% are expected for imperfect matches.",
      balanced:
        "Provide a balanced, fair assessment. Consider both explicit requirements and transferable skills equally.",
      generous:
        "Be optimistic and give credit for transferable skills and adjacent experience. Highlight how the candidate's background could apply even when not an exact match."
    }[tuning.matchStrictness]

    return {
      toneInstruction: tone,
      focusInstruction: focus,
      strictnessInstruction: strictness
    }
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
      userProfile,
      llmTuning = DEFAULT_LLM_TUNING
    } = request

    console.log("model", model)

    const { toneInstruction, focusInstruction } =
      this.tuningInstructions(llmTuning)
    const extraInstructions = [toneInstruction, focusInstruction]
      .filter(Boolean)
      .join(" ")
    const systemPrompt = extraInstructions
      ? `${prompts.resumeSystemPrompt}\n\nADDITIONAL STYLE INSTRUCTIONS: ${extraInstructions}`
      : prompts.resumeSystemPrompt

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
          { role: "system", content: systemPrompt },
          { role: "user", content: interpolatedUserPrompt }
        ],
        stream: false,
        temperature: llmTuning.temperature,
        top_p: llmTuning.topP,
        max_tokens: llmTuning.maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    const content = data?.message?.content
    if (!content) {
      console.error("[OllamaClient] generate: unexpected response shape", JSON.stringify(data))
    }
    return content || "No content generated"
  }

  async generateCoverLetter(request: GenerateRequest): Promise<string> {
    const {
      jobDescription,
      companyName,
      jobTitle,
      model,
      prompts,
      userProfile,
      llmTuning = DEFAULT_LLM_TUNING
    } = request

    const { toneInstruction } = this.tuningInstructions(llmTuning)
    const systemPrompt = toneInstruction
      ? `${prompts.coverLetterSystemPrompt}\n\nADDITIONAL STYLE INSTRUCTIONS: ${toneInstruction}`
      : prompts.coverLetterSystemPrompt

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
          { role: "system", content: systemPrompt },
          { role: "user", content: interpolatedUserPrompt }
        ],
        stream: false,
        temperature: llmTuning.temperature,
        top_p: llmTuning.topP,
        max_tokens: llmTuning.maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    const content = data?.message?.content
    if (!content) {
      console.error("[OllamaClient] generateCoverLetter: unexpected response shape", JSON.stringify(data))
    }
    return content || "No content generated"
  }

  async generateResumeAndCoverLetter(
    request: GenerateRequest
  ): Promise<{ resume: string; coverLetter: string }> {
    const resume = await this.generate(request)
    const coverLetter = await this.generateCoverLetter(request)
    return { resume, coverLetter }
  }

  async extractJobDetails(rawText: string, model: string): Promise<{
    companyName: string
    jobTitle: string
    jobDescription: string
  }> {
    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a job posting parser. Extract structured data and return ONLY a valid JSON object with no markdown, no explanation."
          },
          {
            role: "user",
            content: `Extract the job details from this text and return ONLY this JSON shape:
{"companyName":"...","jobTitle":"...","jobDescription":"..."}

Text:
${rawText.substring(0, 6000)}`
          }
        ],
        stream: false,
        temperature: 0,
        top_p: 1,
        max_tokens: 512
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data?.message?.content || "{}"
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in response")

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.companyName && !parsed.jobTitle && !parsed.jobDescription) {
      throw new Error("Missing required fields")
    }

    return {
      companyName: String(parsed.companyName || ""),
      jobTitle: String(parsed.jobTitle || ""),
      jobDescription: String(parsed.jobDescription || "")
    }
  }

  async analyzeMatch(request: GenerateRequest): Promise<{
    percentage: number
    summary: string
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
  }> {
    const llmTuning = request.llmTuning ?? DEFAULT_LLM_TUNING

    try {
      const userPrompt = `You are a career advisor. Score this candidate on FOUR dimensions against the job posting, then provide qualitative analysis.

DIMENSION SCORING — be literal, score only what is explicitly stated in the candidate profile:
- "skillsCoverage" (0–100): what % of the job's REQUIRED skills/technologies the candidate explicitly lists. 100 = all required skills present, 50 = half present, 0 = none.
- "experienceMatch" (0–100): how well the candidate's seniority and years of experience match the role. 100 = exact fit, 50 = somewhat under/over-qualified, 0 = completely mismatched.
- "domainFit" (0–100): relevance of the candidate's industry/domain background. 100 = same domain, 50 = adjacent, 0 = unrelated.
- "bonusSkills" (0–100): coverage of the job's nice-to-have/preferred (non-required) skills. 100 = all bonus skills present, 0 = none.

Respond with ONLY a single valid JSON object — no prose, no markdown fences.

Required shape:
{
  "skillsCoverage": <integer 0–100>,
  "experienceMatch": <integer 0–100>,
  "domainFit": <integer 0–100>,
  "bonusSkills": <integer 0–100>,
  "summary": "<2 concise sentences summarising overall fit>",
  "strengths": ["<specific strength>", ...],
  "weaknesses": ["<specific gap>", ...],
  "improvements": ["<actionable step>", ...]
}

strengths, weaknesses, and improvements must each have 3–5 items.

---
Job Title: ${request.jobTitle} at ${request.companyName}

Job Description:
${request.jobDescription.substring(0, 2500)}

Candidate Profile:
${this.formatUserProfile(request.userProfile, true)}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30_000)
      let response: Response
      try {
        response = await fetch(`${this.config.baseUrl}/chat`, {
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
            stream: false,
            temperature: Math.min(llmTuning.temperature, 0.4),
            top_p: llmTuning.topP,
            max_tokens: 1024
          }),
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data?.message?.content || "{}"

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("No JSON object found in response")
      const parsed = JSON.parse(jsonMatch[0])

      const clamp = (n: unknown) =>
        Math.min(100, Math.max(0, Number(n) || 0))

      // Weighted composite computed here — model cannot inflate this number
      const skills = clamp(parsed.skillsCoverage)
      const exp = clamp(parsed.experienceMatch)
      const domain = clamp(parsed.domainFit)
      const bonus = clamp(parsed.bonusSkills)
      const percentage = Math.round(
        0.4 * skills + 0.3 * exp + 0.2 * domain + 0.1 * bonus
      )

      return {
        percentage,
        summary: String(parsed.summary || ""),
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.map(String)
          : [],
        weaknesses: Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses.map(String)
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.map(String)
          : []
      }
    } catch (err) {
      return {
        percentage: 0,
        summary: "Match analysis unavailable.",
        strengths: [],
        weaknesses: [],
        improvements: []
      }
    }
  }
}

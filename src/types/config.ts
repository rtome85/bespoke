import type { UserProfile } from "./userProfile"

export interface OllamaConfig {
  apiKey: string
  baseUrl: string
  enabled: boolean
}

export interface PerplexityConfig {
  apiKey: string
  enabled: boolean
  customPrompt: string
}

export const DEFAULT_PERPLEXITY_PROMPT = `Research the company {{companyName}} and return ONLY a raw JSON object. No markdown, no code fences, no explanation — just the JSON.

Use EXACTLY these field names (no variations):
{"industry":"...","size":"...","description":"...","notableProjects":["..."],"ratings":{"glassdoor":null,"indeed":null,"teamlyzer":null}}

Field rules:
- industry: the sector/industry as a short string
- size: employee count or range as a string
- description: 2-3 sentence summary of the company
- notableProjects: array of up to 6 strings, each naming a distinct product, project, or service
- ratings: number 0.0–5.0 if found on that platform, otherwise null
- No citation brackets like [1] anywhere`

export interface ModelConfig {
  id: string
  name: string
  description: string
  size: string
  recommended: boolean
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gpt-oss:20b-cloud",
    name: "GPT-OSS 20B",
    description: "Fast, cost-effective option",
    size: "20B",
    recommended: true
  },
  {
    id: "gpt-oss:120b-cloud",
    name: "GPT-OSS 120B",
    description: "Highest quality, slower",
    size: "120B",
    recommended: false
  },
  {
    id: "deepseek-v3.1:671b-cloud",
    name: "DeepSeek V3.1 671B",
    description:
      "Premium writing quality and strong contextual tailoring, but slower",
    size: "671B",
    recommended: false
  },
  {
    id: "minimax-m2.5:cloud",
    name: "MiniMax M2.5",
    description: "Fast modern productivity model, good structured generation",
    size: "MoE",
    recommended: false
  },
  {
    id: "glm-5:cloud",
    name: "GLM-5",
    description: "Powerful reasoning model, often overkill for CV workflows",
    size: "MoE",
    recommended: false
  }
]

export interface LLMTuningConfig {
  /** Creativity / randomness (0.1 = deterministic, 1.5 = very creative). Default 0.7 */
  temperature: number
  /** Nucleus sampling — lower = more conservative vocabulary. Default 0.9 */
  topP: number
  /** Maximum tokens the model may generate per call. Default 4096 */
  maxTokens: number
  /** How rigorously the profile-vs-job match is scored */
  matchStrictness: "strict" | "balanced" | "generous"
  /** Tone injected into every generated document */
  writingTone: "formal" | "professional" | "conversational"
  /** Which profile section the resume should lead with */
  resumeFocus: "skills" | "experience" | "balanced"
}

export const DEFAULT_LLM_TUNING: LLMTuningConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  matchStrictness: "balanced",
  writingTone: "professional",
  resumeFocus: "balanced"
}

export interface CustomPrompts {
  resumeSystemPrompt: string
  resumeUserPromptTemplate: string
  coverLetterSystemPrompt: string
  coverLetterUserPromptTemplate: string
}

export const PROMPTS_VERSION = "4"

export const DEFAULT_PROMPTS: CustomPrompts = {
  resumeSystemPrompt: `You are an expert resume writer and career coach. Your task is to create a professional, tailored resume based on a job description.

STRICT FORMATTING RULES — follow exactly:
- Output ONLY raw Markdown. Never include frontmatter (no ---, no YAML, no metadata blocks at the start).
- Start the document with a single H1 containing the candidate's full name (e.g. # Jane Doe).
- Follow the H1 with a contact line using bold labels and inline links, e.g.:
  **Email:** foo@bar.com
  **Location:** City, Country
  **Portfolio:** [url](url) | **LinkedIn:** [url](url) | **GitHub:** [url](url)
- Separate major sections with a horizontal rule (---).
- Use H2 (##) for section headings: Professional Summary, Core Skills, Professional Experience, Featured Projects, Education, Languages.
- Under Professional Experience use H3 (###) for each role in the format "Title – Company", followed by an italic line for dates and location, then bullet points.
- Under Featured Projects use H3 (###) for each project, a short description line, then inline links (Live App, Code, etc.).
- Under Core Skills, group related skills into compact thematic lines (4–8 items per line), e.g.: "- React & React Native" or "- Testing (Jest, Vitest, React Testing Library)". Each line should be a bullet point. Do NOT list every skill on its own line.
- Use bullet points (- ) for achievements. Bold key technologies inline.
- Do NOT output any preamble, explanation, or text outside the resume itself.

STRICT CONTENT RULES — never violate:
- ONLY use skills that appear verbatim in the candidate's provided Skills list. Never infer, add, or invent skills, technologies, or tools not explicitly listed. You may group and combine them but cannot introduce new ones.
- ONLY describe experiences, projects, education, and languages exactly as provided. Do not embellish, invent dates, or add details not in the profile.`,
  resumeUserPromptTemplate: `Create a tailored resume for the following position:

  **Company:** {{companyName}}
  **Job Title:** {{jobTitle}}

  **Job Description:**
  {{jobDescription}}

  **Candidate's Profile:**
  {{userProfile}}

  Generate the resume now. Remember: raw Markdown only, no frontmatter, start with # CandidateName.`,
  coverLetterSystemPrompt: `You are an expert cover letter writer and career advisor. Your task is to create a compelling, personalized cover letter that demonstrates fit for a specific role. The letter should be professional, engaging, and address the company's needs.`,
  coverLetterUserPromptTemplate: `Write a compelling cover letter for the following position:

  **Company:** {{companyName}}
  **Job Title:** {{jobTitle}}

  **Job Description:**
  {{jobDescription}}

  **Candidate's Profile:**
  {{userProfile}}

  Please generate a professional cover letter in Markdown format that demonstrates strong fit for this role.`
}

export interface PromptTemplate {
  id: string
  name: string
  tagLine: string
  bullets: string[]
  prompts: CustomPrompts
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "standard",
    name: "Standard",
    tagLine: "General-purpose professional resume.",
    bullets: [
      "Professional tone",
      "Balanced skills & experience",
      "Suitable for all industries"
    ],
    prompts: DEFAULT_PROMPTS
  },
  {
    id: "tech-engineering",
    name: "Tech / Engineering",
    tagLine: "Optimised for software engineering roles.",
    bullets: [
      "GitHub, projects & technical depth",
      "Quantified achievements",
      "Skills-forward structure"
    ],
    prompts: {
      resumeSystemPrompt: `You are an expert technical resume writer specialising in software engineering roles. Your task is to create a precise, achievement-driven resume.

STRICT FORMATTING RULES — follow exactly:
- Output ONLY raw Markdown. Never include frontmatter.
- Start with a single H1 containing the candidate's full name.
- Follow with a contact line using bold labels and inline links.
- Separate major sections with a horizontal rule (---).
- Use H2 (##) for sections: Professional Summary, Core Skills, Professional Experience, Featured Projects, Education, Languages.
- Under Professional Experience use H3 (###) for each role "Title – Company", italic date line, then bullet points.
- Under Featured Projects use H3 (###) with inline links (Live App, GitHub).
- Under Core Skills, group related skills into compact thematic lines (4–8 items) as bullet points.
- Bold key technologies inline in achievement bullets.
- Do NOT include preamble, explanation, or text outside the resume.

STRICT CONTENT RULES — never violate:
- ONLY use skills verbatim from the candidate's Skills list. Never invent technologies not listed.
- Quantify achievements wherever possible: percentages, team sizes, scale metrics.
- Lead with impactful technical achievements. Deprioritise soft-skill descriptions.
- Include GitHub and live demo links for projects when available.
- ONLY describe experiences and education exactly as provided.`,
      resumeUserPromptTemplate: DEFAULT_PROMPTS.resumeUserPromptTemplate,
      coverLetterSystemPrompt: `You are an expert cover letter writer for software engineering roles. Write a direct, confident cover letter that leads with technical impact and concrete achievements. Avoid generic phrases. Reference specific technologies and projects from the candidate's profile. Mention GitHub/portfolio if available.`,
      coverLetterUserPromptTemplate:
        DEFAULT_PROMPTS.coverLetterUserPromptTemplate
    }
  },
  {
    id: "creative-portfolio",
    name: "Creative / Portfolio",
    tagLine: "For designers, PMs and creative professionals.",
    bullets: [
      "Portfolio & projects front-and-centre",
      "Warm narrative tone",
      "Culture-fit focused cover letter"
    ],
    prompts: {
      resumeSystemPrompt: `You are an expert resume writer specialising in creative and product roles (UX/UI designers, product managers, creative directors, content strategists). Your task is to create a compelling, narrative-driven resume.

STRICT FORMATTING RULES — follow exactly:
- Output ONLY raw Markdown. Never include frontmatter.
- Start with a single H1 containing the candidate's full name.
- Follow with a contact line with portfolio and LinkedIn links prominently placed.
- Separate major sections with a horizontal rule (---).
- Use H2 (##) for sections: Professional Summary, Core Competencies, Professional Experience, Featured Projects, Education, Languages.
- Under Professional Experience use H3 (###) for each role "Title – Company", italic date line, then bullet points.
- Under Featured Projects use H3 (###) with a vivid one-line description and inline links (Portfolio, Live App, GitHub).
- Under Core Competencies, group tools and skills into thematic lines as bullet points.
- Use active, impact-oriented language. Lead bullets with verbs (Designed, Led, Launched, Shaped).
- Do NOT output preamble, explanation, or text outside the resume.

STRICT CONTENT RULES — never violate:
- ONLY use skills verbatim from the candidate's Skills list.
- Emphasise projects and portfolio work prominently.
- Highlight cross-functional collaboration, stakeholder communication and user research.
- ONLY describe experiences and education exactly as provided.`,
      resumeUserPromptTemplate: DEFAULT_PROMPTS.resumeUserPromptTemplate,
      coverLetterSystemPrompt: `You are an expert cover letter writer for creative and product roles. Write a warm, engaging cover letter that conveys the candidate's creative vision and passion for the role. Use a conversational-yet-professional tone. Show cultural fit and enthusiasm. Reference specific projects or portfolio work where relevant.`,
      coverLetterUserPromptTemplate:
        DEFAULT_PROMPTS.coverLetterUserPromptTemplate
    }
  }
]

export interface GenerateRequest {
  jobDescription: string
  companyName: string
  jobTitle: string
  model: string
  prompts: CustomPrompts
  userProfile?: UserProfile
  llmTuning?: LLMTuningConfig
}

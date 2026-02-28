import type { UserProfile } from "./userProfile"

export interface OllamaConfig {
  apiKey: string
  baseUrl: string
  enabled: boolean
}

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
    description: "Massive model, complex reasoning",
    size: "671B",
    recommended: false
  },
  {
    id: "qwen3-coder:480b-cloud",
    name: "Qwen3 Coder 480B",
    description: "Optimized for technical content",
    size: "480B",
    recommended: false
  }
]

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

export interface GenerateRequest {
  jobDescription: string
  companyName: string
  jobTitle: string
  model: string
  prompts: CustomPrompts
  userProfile?: UserProfile
}

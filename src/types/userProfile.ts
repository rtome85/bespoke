export interface Skill {
  id: string // crypto.randomUUID()
  name: string
  yearsOfExperience: number
  category?: string
}

export interface WorkExperience {
  id: string // crypto.randomUUID()
  jobTitle: string
  company: string
  startDate: string // ISO date string: "2023-04-01"
  endDate: string | null // null for current role
  achievements: string[] // Array of achievement strings
}

export interface PersonalProject {
  id: string // crypto.randomUUID()
  title: string
  description: string
  liveDemoUrl?: string
  githubRepoUrl?: string
}

export interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  website?: string
  linkedin?: string
  github?: string
  summary: string
}

export interface Education {
  id: string // crypto.randomUUID()
  degree: string
  institution: string
  fieldOfStudy?: string
  startDate: string // ISO date string: "2020-09-01"
  endDate: string | null // null for current studies
  description?: string
}

export interface Certificate {
  id: string // crypto.randomUUID()
  name: string          // e.g. "AWS Certified Developer"
  issuer: string        // e.g. "Amazon Web Services"
  issueDate: string     // ISO date string: "2023-06-01"
  expiryDate?: string | null // null = no expiry
  credentialUrl?: string
}

export interface Language {
  id: string // crypto.randomUUID()
  name: string
  level: string // e.g. "Native", "Proficient (C1)", "Professional (B1)"
}

export interface UserProfile {
  personalInfo: PersonalInfo
  education: Education[]
  certificates: Certificate[]
  skills: Skill[]
  workExperience: WorkExperience[]
  personalProjects: PersonalProject[]
  languages: Language[]
}

export type ApplicationStatus =
  | "Applied"
  | "HR Interview"
  | "1st Technical Interview"
  | "2nd Technical Interview"
  | "Final Interview"
  | "Offer"
  | "Reject"

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Applied",
  "HR Interview",
  "1st Technical Interview",
  "2nd Technical Interview",
  "Final Interview",
  "Offer",
  "Reject",
]

export interface SavedApplication {
  id: string
  company: string
  jobTitle: string
  status: ApplicationStatus
  date: string       // "YYYY-MM-DD"
  createdAt: string  // ISO timestamp, set once on save

  jobUrl?: string     // URL of the job posting

  // Optional — present only when saved from the success screen
  resumeContent?: string
  resumeFilename?: string
  coverLetterContent?: string
  coverLetterFilename?: string
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    summary: ""
  },
  education: [],
  certificates: [],
  skills: [],
  workExperience: [],
  personalProjects: [],
  languages: []
}

import type { ApplicationStatus } from "~types/userProfile"

export interface GeneratedDocuments {
  resumeContent: string
  resumeFilename: string
  coverLetterContent: string
  coverLetterFilename: string
}

export interface MatchResult {
  percentage: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

export interface GenerationResult {
  match: MatchResult
  // Present only after the user requests document generation (step 2)
  resumeContent?: string
  resumeFilename?: string
  coverLetterContent?: string
  coverLetterFilename?: string
}

export interface SaveApplicationFormData {
  company: string
  jobTitle: string
  status: ApplicationStatus
  date: string
  jobUrl: string
  tags: string[]
  notes: string
}

export interface RoutingLabels {
  scoring?: string
  drafting?: string
}

export interface PendingJobData {
  extracting?: boolean
  error?: unknown
  companyName?: string
  jobTitle?: string
  selectedText?: string
  tabUrl?: string
}

export type AddedGapSkills = Record<number, { name: string; years: number }>

export type DialogView =
  | "form"
  | "loading"
  | "success"
  | "saveForm"
  | "extracting"

export type MatchAccordionSection = "strengths" | "weaknesses" | "improvements"

export type TriageDecision = "apply" | "save" | "discard"

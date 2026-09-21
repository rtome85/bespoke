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
  name: string // e.g. "AWS Certified Developer"
  issuer: string // e.g. "Amazon Web Services"
  issueDate: string // ISO date string: "2023-06-01"
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
  | "Saved"
  | "Applied"
  | "Interviewing"
  | "Offer"
  | "Reject"

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Interviewing",
  "Offer",
  "Reject"
]

// ── Interview rounds ───────────────────────────────────────────────────────────

export type RoundType = "HR" | "Technical" | "Final" | "Custom"
export type RoundFormat = "phone" | "video" | "onsite"

/** A single line item in the "likely topics" / "talking points" checklists. */
export interface PrepItem {
  text: string
  checked?: boolean // "feel ready" / "rehearsed"
  pinned?: boolean // starred
  userAdded?: boolean // typed by the user, not model-seeded
}

/**
 * A weakness the interviewer is likely to press on, with a prepared answer.
 * Seeded from the application's `matchWeaknesses` where they exist.
 */
export interface GapDefense {
  gap: string
  response: string
  checked?: boolean // "I have an answer ready"
  pinned?: boolean
  userAdded?: boolean
}

/** A rehearsable story, built from a real achievement in the profile. */
export interface StarStory {
  title: string
  situation: string
  task: string
  action: string
  result: string
  /** `likelyTopics` entries this story answers. */
  covers?: string[]
  checked?: boolean // "rehearsed"
  pinned?: boolean
  userAdded?: boolean
}

/**
 * A technical question an interviewer is likely to ask, with an answer worth
 * rehearsing. `topic` is the technology or framework from the job description
 * the question comes out of, so the drill can be read stack by stack.
 */
export interface TechQuestion {
  question: string
  answer: string
  topic?: string
  checked?: boolean // "I can answer this"
  pinned?: boolean
  userAdded?: boolean
}

/**
 * A hands-on exercise to work through before a technical round — the kind of
 * task the interviewer is likely to set, with what a strong solution shows so
 * the candidate can mark their own attempt.
 */
export interface TechExercise {
  title: string
  /** The task itself, phrased the way an interviewer would set it. */
  prompt: string
  /** What a strong answer demonstrates — the self-review checklist. */
  approach: string
  topic?: string
  checked?: boolean // "I worked through this"
  pinned?: boolean
  userAdded?: boolean
}

export interface RoundPrep {
  companyResearch?: string // markdown; copied from companyResearchCache at generate time
  companyResearchAt?: string // ISO
  /** Which research strategy produced `companyResearch` (see ResearchSource). */
  companyResearchSource?: string
  likelyTopics?: PrepItem[]
  talkingPoints?: PrepItem[]
  /** Questions for the candidate to ask this interviewer. */
  questionsToAsk?: PrepItem[]
  /** Prepared answers for the weak spots in this candidate's fit. */
  gapDefenses?: GapDefense[]
  /**
   * Rehearsable STAR stories drawn from the profile. Behavioural — written for
   * every round type except Technical (see `isTechnicalRound`).
   */
  starStories?: StarStory[]
  /**
   * Technical rounds only: likely questions about this job's stack, each with
   * an answer to rehearse.
   */
  techQuestions?: TechQuestion[]
  /** Technical rounds only: exercises to work through before the round. */
  techExercises?: TechExercise[]
  /** What to expect from this round — 2-3 sentences of prose. */
  logistics?: string
  topicsPointsAt?: string // ISO — last LLM generation of the model-written sections
  notes?: string // user free text; never overwritten by regeneration
}

export type DebriefOutcome = "advance" | "offer" | "reject" | "waiting"

export interface Debrief {
  rating?: 1 | 2 | 3 | 4 | 5
  assessment?: string // the one-line "how it went" note
  questionsAsked?: string
  followUps?: { text: string; done?: boolean }[]
  outcome?: DebriefOutcome
  loggedAt?: string // ISO — presence === "logged"
  updatedAt?: string // ISO — last edit
}

export interface InterviewRound {
  id: string // "rnd_" + crypto.randomUUID()
  type: RoundType
  customLabel?: string // when type === "Custom"
  date?: string // "YYYY-MM-DD"; absent === unscheduled
  time?: string // "HH:mm"; absent === time TBD
  format?: RoundFormat
  interviewers?: string // freeform, newline-separated (one person per line)
  createdAt: string // ISO
  synthesized?: boolean // migration-created from a legacy interview status
  prep?: RoundPrep
  debrief?: Debrief
}

export interface SavedApplication {
  id: string
  company: string
  jobTitle: string
  status: ApplicationStatus
  date: string // "YYYY-MM-DD"
  createdAt: string // ISO timestamp, set once on save
  statusUpdatedAt?: string // ISO timestamp, bumped whenever `status` changes; read as `?? createdAt`
  /**
   * ISO timestamp of the first time this application reached a status that
   * means someone answered (`Interviewing` / `Offer` / `Reject`). Stamped
   * once and never moved, because `statusUpdatedAt` keeps advancing and so
   * cannot say when the *first* reply arrived. Absent on applications that
   * were answered before this field existed.
   */
  firstReplyAt?: string

  jobUrl?: string // URL of the job posting

  matchPercentage?: number // Match % calculated by the LLM

  // Optional — persisted from the success screen so documents can be
  // (re)generated later from the applications list without re-scraping.
  jobDescription?: string
  matchSummary?: string
  matchStrengths?: string[]
  matchWeaknesses?: string[]
  matchImprovements?: string[]

  // Optional — present only when saved from the success screen
  resumeContent?: string
  resumeFilename?: string
  coverLetterContent?: string
  coverLetterFilename?: string

  // Scheduled interview rounds for this application (see interviews/*).
  rounds?: InterviewRound[]

  tags?: string[]
  notes?: string
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

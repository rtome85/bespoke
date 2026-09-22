import type { ResearchSource } from "./config"

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

export interface CompanyResearchEntry {
  /** Human-readable markdown. */
  text: string
  /** Structured form when it came from an "about the company" call. */
  parsed?: CompanyInfo
  /** ISO timestamp. */
  generatedAt: string
  /**
   * Which strategy produced this entry. Absent on entries cached before
   * research had more than one source — those all came from Perplexity.
   */
  source?: ResearchSource
  /** Pages or results the synthesis read, for the provenance line. */
  sourceUrls?: string[]
}

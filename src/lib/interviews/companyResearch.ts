import type { CompanyInfo } from "~api/perplexityClient"
import { STORAGE_KEYS } from "~storage/keys"
import { RESEARCH_STALE_MS, type ResearchSource } from "~types/config"

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

/** Past this age the Prep card offers a refresh instead of trusting the cache. */
export function researchIsStale(
  generatedAt: string | undefined,
  now: number = Date.now()
): boolean {
  if (!generatedAt) return false
  const at = Date.parse(generatedAt)
  return Number.isFinite(at) && now - at > RESEARCH_STALE_MS
}

export const researchCacheKey = (company: string) =>
  company.toLowerCase().trim()

/**
 * One storage key per company. Independent keys mean a write for company A
 * (e.g. the side panel's match flow) and a write for company B (the Prep
 * engine fetching) touch disjoint storage — no read-modify-write of a shared
 * cache object, so concurrent writes across contexts can't drop each other.
 */
const entryKey = (company: string) =>
  `${STORAGE_KEYS.COMPANY_RESEARCH_CACHE}:${researchCacheKey(company)}`

export async function readCompanyResearch(
  company: string
): Promise<CompanyResearchEntry | undefined> {
  const k = entryKey(company)
  const res = await chrome.storage.local.get(k)
  return res[k] as CompanyResearchEntry | undefined
}

export async function writeCompanyResearch(
  company: string,
  entry: CompanyResearchEntry
): Promise<void> {
  await chrome.storage.local.set({ [entryKey(company)]: entry })
}

const has = (v?: string) =>
  !!v && v.trim() && !/^not available$/i.test(v.trim())

/** Render a parsed `CompanyInfo` to the prose shown on the Prep card. */
export function companyInfoToMarkdown(info: CompanyInfo): string {
  const lines: string[] = []
  if (has(info.industry)) lines.push(`**Industry** — ${info.industry.trim()}`)
  if (has(info.size)) lines.push(`**Size** — ${info.size.trim()}`)
  if (lines.length) lines.push("")

  if (has(info.description)) {
    lines.push(info.description.trim(), "")
  }

  const projects = (info.notableProjects ?? []).filter((p) => p && p.trim())
  if (projects.length) {
    lines.push("**Notable projects**")
    for (const p of projects) lines.push(`- ${p.trim()}`)
    lines.push("")
  }

  const r = info.ratings ?? {}
  const ratingParts = [
    r.glassdoor != null && `Glassdoor ${r.glassdoor}`,
    r.indeed != null && `Indeed ${r.indeed}`,
    r.teamlyzer != null && `Teamlyzer ${r.teamlyzer}`
  ].filter(Boolean)
  if (ratingParts.length) lines.push(`**Ratings** — ${ratingParts.join(" · ")}`)

  return lines.join("\n").trim()
}

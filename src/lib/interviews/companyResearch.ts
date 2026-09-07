import type { CompanyInfo } from "~api/perplexityClient"
import { STORAGE_KEYS } from "~storage/keys"

export interface CompanyResearchEntry {
  /** Human-readable markdown. */
  text: string
  /** Structured form when it came from the Perplexity "about the company" call. */
  parsed?: CompanyInfo
  /** ISO timestamp. */
  generatedAt: string
}

type Cache = Record<string, CompanyResearchEntry>

export const researchCacheKey = (company: string) =>
  company.toLowerCase().trim()

const KEY = STORAGE_KEYS.COMPANY_RESEARCH_CACHE

export async function readCompanyResearch(
  company: string
): Promise<CompanyResearchEntry | undefined> {
  const res = await chrome.storage.local.get(KEY)
  const cache = (res[KEY] as Cache | undefined) ?? {}
  return cache[researchCacheKey(company)]
}

export async function writeCompanyResearch(
  company: string,
  entry: CompanyResearchEntry
): Promise<void> {
  const res = await chrome.storage.local.get(KEY)
  const cache = (res[KEY] as Cache | undefined) ?? {}
  cache[researchCacheKey(company)] = entry
  await chrome.storage.local.set({ [KEY]: cache })
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
    r.glassdoor && `Glassdoor ${r.glassdoor}`,
    r.indeed && `Indeed ${r.indeed}`,
    r.teamlyzer && `Teamlyzer ${r.teamlyzer}`
  ].filter(Boolean)
  if (ratingParts.length) lines.push(`**Ratings** — ${ratingParts.join(" · ")}`)

  return lines.join("\n").trim()
}

/**
 * Called from the side-panel match flow after it fetches company info, so the
 * Prep engine usually doesn't have to hit Perplexity again. Overwrites — the
 * match flow's data is at least as fresh as anything already cached.
 */
export async function seedCompanyResearch(
  company: string,
  info: CompanyInfo
): Promise<void> {
  const text = companyInfoToMarkdown(info)
  if (!text) return
  await writeCompanyResearch(company, {
    text,
    parsed: info,
    generatedAt: new Date().toISOString()
  })
}

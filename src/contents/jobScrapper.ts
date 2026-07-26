import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.linkedin.com/*",
    "https://linkedin.com/*",
    "<all_urls>"
  ],
  all_frames: false,
  run_at: "document_end"
}

// Selectors for the job description body, ordered most- to least-specific.
const DESCRIPTION_SELECTORS = [
  "#jobDescriptionText",
  "[data-testid='jobsearch-jobDescriptionText']",
  ".jobsearch-jobDescriptionText",
  "[data-job-description]",
  "[data-testid='job-description']",
  "#job-details",
  ".jobs-description__content",
  ".jobs-description-content",
  ".jobs-box__html-content",
  ".jobs-description__container"
]

const COMPANY_SELECTORS = [
  "[data-testid='inlineHeader-companyName'] a",
  "[data-testid='inlineHeader-companyName']",
  ".jobsearch-InlineCompanyRating-companyHeader a",
  ".jobsearch-InlineCompanyRating-companyHeader",
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  "[class*='company-name'] a",
  "[class*='company-name']"
]

const TITLE_SELECTORS = [
  "[data-testid='jobsearch-JobInfoHeader-title']",
  "[data-testid='simpler-jobTitle']",
  ".jobsearch-JobInfoHeader-title",
  ".job-details-jobs-unified-top-card__job-title h1",
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title h1",
  ".jobs-unified-top-card__job-title",
  "h1.t-24",
  "h1[class*='job-title']"
]

function normalizeWhitespace(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
}

// Return the first element (in selector priority order) whose text is
// non-empty. Unlike a comma-joined querySelector — which matches in document
// order and ignores the list's priority — this honours DESCRIPTION_SELECTORS
// ordering so the most-specific matching element wins.
function queryFirstElement(
  selectors: string[],
  root: Document
): Element | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector)
    if (normalizeWhitespace(el?.textContent)) return el
  }
  return null
}

function queryFirstMatch(selectors: string[], root: Document): string {
  return normalizeWhitespace(queryFirstElement(selectors, root)?.textContent)
}

type JobData = {
  companyName: string
  jobTitle: string
  description: string
}

// LinkedIn is a SPA: the currently-selected job is identified by the
// `currentJobId` query param (jobs search / collections) or the
// `/jobs/view/<id>` path. Always read this from the top frame's URL.
function getCurrentJobId(): string | null {
  try {
    const url = new URL(window.location.href)
    const fromQuery = url.searchParams.get("currentJobId")
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery
    const fromPath = url.pathname.match(/\/jobs\/view\/(\d+)/)
    if (fromPath) return fromPath[1]
  } catch {
    // ignore malformed URLs
  }
  return null
}

// Collect every JobPosting node found anywhere in a JSON-LD document.
function collectJobPostings(value: unknown): Record<string, any>[] {
  if (!value || typeof value !== "object") return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectJobPostings(item))
  }

  const object = value as Record<string, any>
  const rawTypes = Array.isArray(object["@type"])
    ? object["@type"]
    : [object["@type"]]
  const types = rawTypes.map((type) => String(type).split("/").pop())

  const found: Record<string, any>[] = []
  if (types.includes("JobPosting")) found.push(object)
  for (const nested of Object.values(object)) {
    found.push(...collectJobPostings(nested))
  }
  return found
}

// Does a JSON-LD JobPosting correspond to the given LinkedIn job id?
function jobPostingMatchesId(
  jobPosting: Record<string, any>,
  currentJobId: string
): boolean {
  const identifier = jobPosting.identifier
  const identifierValues = (
    Array.isArray(identifier) ? identifier : [identifier]
  )
    .map((entry) => (entry && typeof entry === "object" ? entry.value : entry))
    .filter(Boolean)
    .map(String)
  if (identifierValues.includes(currentJobId)) return true

  const url = jobPosting.url || jobPosting["@id"]
  if (typeof url === "string" && url.includes(currentJobId)) return true

  return false
}

// Extract job data from JSON-LD structured data within a document.
//
// The JSON-LD block is server-rendered for the job active on initial load and
// is NOT updated during SPA navigation, so we only trust it when it matches the
// currently-selected job id; when a job id is known but no posting matches, we
// return null rather than leak a stale posting.
function extractFromJsonLd(
  root: Document,
  currentJobId: string | null
): JobData | null {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]')
  const postings: Record<string, any>[] = []
  for (const script of scripts) {
    try {
      postings.push(...collectJobPostings(JSON.parse(script.textContent || "")))
    } catch {
      // ignore parse errors
    }
  }
  if (postings.length === 0) return null

  let jobPosting: Record<string, any> | undefined
  if (currentJobId) {
    jobPosting = postings.find((posting) =>
      jobPostingMatchesId(posting, currentJobId)
    )
    // Known job id but the (stale) JSON-LD is for a different job — don't use it.
    if (!jobPosting) return null
  } else {
    jobPosting = postings[0]
  }

  return {
    companyName: normalizeWhitespace(jobPosting.hiringOrganization?.name),
    jobTitle: normalizeWhitespace(jobPosting.title || jobPosting.name),
    description: normalizeWhitespace(jobPosting.description)
  }
}

// Does this document reference the given job id (via a link or data attribute)?
// Used to pick the correct frame when LinkedIn renders the selected job inside
// a same-origin `/preload/` iframe.
function documentReferencesJob(root: Document, currentJobId: string): boolean {
  try {
    const id = CSS.escape(currentJobId)
    return !!root.querySelector(
      `a[href*="${id}"], [data-job-id="${id}"], [data-occludable-job-id="${id}"]`
    )
  } catch {
    return false
  }
}

// Pull job data out of a single document (top frame or an iframe's document).
function extractFromDocument(
  root: Document,
  currentJobId: string | null
): JobData {
  const jobElement = queryFirstElement(DESCRIPTION_SELECTORS, root)
  const jsonLd = extractFromJsonLd(root, currentJobId)

  const companyName = queryFirstMatch(COMPANY_SELECTORS, root)
  const jobTitle = queryFirstMatch(TITLE_SELECTORS, root)

  return {
    description: normalizeWhitespace(
      jobElement?.textContent || jsonLd?.description || ""
    ),
    companyName: companyName || jsonLd?.companyName || "",
    jobTitle: jobTitle || jsonLd?.jobTitle || ""
  }
}

// Gather candidate documents: the top frame plus every reachable (same-origin)
// iframe. On LinkedIn collections/search pages the selected job's detail pane is
// rendered inside a `/preload/` iframe, so the top frame alone has no job data.
function collectCandidateDocuments(): { doc: Document; visible: boolean }[] {
  const candidates: { doc: Document; visible: boolean }[] = [
    { doc: document, visible: true }
  ]

  for (const iframe of Array.from(document.querySelectorAll("iframe"))) {
    let doc: Document | null = null
    try {
      doc = iframe.contentDocument
    } catch {
      // cross-origin iframe — not accessible, skip.
      doc = null
    }
    if (!doc) continue

    const rect = iframe.getBoundingClientRect()
    const style = window.getComputedStyle(iframe)
    const visible =
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"

    candidates.push({ doc, visible })
  }

  return candidates
}

// Find the job that is actually selected, searching across frames and scoring
// candidates so the currently-displayed job wins over prefetched/stale ones.
function scrapeSelectedJob(): JobData {
  const currentJobId = getCurrentJobId()
  const candidates = collectCandidateDocuments()

  let best: JobData | null = null
  let bestScore = -1

  for (const { doc, visible } of candidates) {
    const data = extractFromDocument(doc, currentJobId)
    // A candidate is only useful if it actually carries job content.
    if (!data.description && !data.jobTitle) continue

    let score = 0
    if (data.description) score += 1
    if (visible) score += 2
    // Strongest signal: this frame references the job id in the top-frame URL.
    if (currentJobId && documentReferencesJob(doc, currentJobId)) score += 4

    if (score > bestScore) {
      bestScore = score
      best = data
    }
  }

  if (best) return best

  // Nothing job-shaped found anywhere: fall back to the top document body so the
  // downstream LLM extraction still has something to work with.
  const fallback = extractFromDocument(document, currentJobId)
  return {
    description:
      fallback.description || normalizeWhitespace(document.body.textContent),
    companyName: fallback.companyName,
    jobTitle: fallback.jobTitle
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSource") {
    const job = scrapeSelectedJob()
    sendResponse({
      data: job.description,
      companyName: job.companyName,
      jobTitle: job.jobTitle
    })
  }
  return true
})

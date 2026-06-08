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

function normalizeWhitespace(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
}

function queryFirstMatch(selectors: string[]): string {
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    const text = normalizeWhitespace(el?.textContent)
    if (text) return text
  }
  return ""
}

type JobData = {
  companyName: string
  jobTitle: string
  description: string
}

function findJobPosting(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object") return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const jobPosting = findJobPosting(item)
      if (jobPosting) return jobPosting
    }
    return null
  }

  const object = value as Record<string, any>
  const rawTypes = Array.isArray(object["@type"])
    ? object["@type"]
    : [object["@type"]]
  const types = rawTypes.map((type) => String(type).split("/").pop())
  if (types.includes("JobPosting")) return object

  for (const nested of Object.values(object)) {
    const jobPosting = findJobPosting(nested)
    if (jobPosting) return jobPosting
  }

  return null
}

// Try to extract job data from JSON-LD structured data (most stable).
function extractFromJsonLd(): JobData | null {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  )
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "")
      const jobPosting = findJobPosting(data)
      if (jobPosting) {
        return {
          companyName: normalizeWhitespace(jobPosting.hiringOrganization?.name),
          jobTitle: normalizeWhitespace(jobPosting.title || jobPosting.name),
          description: normalizeWhitespace(jobPosting.description)
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSource") {
    // 1st strategy: JSON-LD structured data
    const jsonLd = extractFromJsonLd()

    // 2nd strategy: data-* attributes
    const jobDescEl = document.querySelector(
      [
        "#jobDescriptionText",
        "[data-testid='jobsearch-jobDescriptionText']",
        ".jobsearch-jobDescriptionText",
        "[data-job-description]",
        "[data-testid='job-description']"
      ].join(", ")
    )

    // 3rd strategy: CSS class selectors
    const jobElement =
      jobDescEl ||
      document.querySelector(
        ".jobs-description-content, .jobs-description__content, #job-details"
      )

    const companyName = queryFirstMatch([
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
    ])

    const jobTitle = queryFirstMatch([
      "[data-testid='jobsearch-JobInfoHeader-title']",
      "[data-testid='simpler-jobTitle']",
      ".jobsearch-JobInfoHeader-title",
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      "h1.t-24",
      "h1[class*='job-title']"
    ])

    sendResponse({
      data: normalizeWhitespace(
        jobElement?.textContent ||
          jsonLd?.description ||
          document.body.textContent
      ),
      companyName: companyName || jsonLd?.companyName,
      jobTitle: jobTitle || jsonLd?.jobTitle
    })
  }
  return true
})

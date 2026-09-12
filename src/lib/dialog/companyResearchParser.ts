import type { CompanyInfo } from "~api/perplexityClient"

function getField(object: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (object[key] !== undefined) return object[key]
    const found = Object.keys(object).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase()
    )
    if (found !== undefined) return object[found]
  }

  for (const key of keys) {
    const found = Object.keys(object).find((candidate) =>
      candidate.toLowerCase().includes(key.toLowerCase())
    )
    if (found !== undefined) return object[found]
  }

  return undefined
}

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\[\d+\]/g, "").trim()
    : "Not available"
}

function cleanRating(value: unknown): number | undefined {
  const rating =
    typeof value === "number" ? value : Number.parseFloat(value as string)
  return !Number.isNaN(rating) && rating >= 0 && rating <= 5
    ? rating
    : undefined
}

function parseProjects(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((project) => cleanString(project))
      .filter((project) => project.length > 3)
      .slice(0, 6)
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) =>
        line
          .replace(/^[-•*]\s+/, "")
          .replace(/\[\d+\]/g, "")
          .trim()
      )
      .filter((line) => line.length > 3)
      .slice(0, 6)
  }

  return []
}

export function parseCompanyInfo(content: string): CompanyInfo {
  const json = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()

  let raw: Record<string, unknown> = {}
  try {
    raw = JSON.parse(json)
  } catch {
    console.error("Failed to parse Perplexity JSON response", content)
  }

  const ratings =
    (getField(raw, "ratings") as Record<string, unknown> | undefined) ?? {}

  return {
    industry: cleanString(
      getField(raw, "industry", "Industry/Sector", "sector", "industry_sector")
    ),
    size: cleanString(
      getField(
        raw,
        "size",
        "Company size (employees)",
        "employees",
        "company_size_employees",
        "headcount"
      )
    ),
    description: cleanString(
      getField(
        raw,
        "description",
        "Brief description",
        "brief_description",
        "about",
        "overview",
        "summary"
      )
    ),
    notableProjects: parseProjects(
      getField(
        raw,
        "notableProjects",
        "Notable projects, products, or services",
        "notable_projects_products_services",
        "projects",
        "products",
        "services"
      )
    ),
    ratings: {
      glassdoor: cleanRating(
        ratings.glassdoor ??
          getField(raw, "glassdoor", "Glassdoor Rating", "glassdoor_rating")
      ),
      indeed: cleanRating(
        ratings.indeed ??
          getField(raw, "indeed", "Indeed Rating", "indeed_rating")
      ),
      teamlyzer: cleanRating(
        ratings.teamlyzer ??
          getField(
            raw,
            "teamlyzer",
            "Teamlyzer Rating",
            "Overall Teamlyzer Rating"
          )
      )
    },
    sources: []
  }
}

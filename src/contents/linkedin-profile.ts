import type { PlasmoCSConfig } from "plasmo"

import type {
  Education,
  Language,
  Skill,
  UserProfile,
  WorkExperience
} from "~types/userProfile"

export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/in/*"],
  all_frames: false,
  run_at: "document_end"
}

function normalizeWhitespace(text: string | null | undefined): string {
  if (!text) return ""
  return text.trim().replace(/\s+/g, " ")
}

function queryText(selectors: string[]): string {
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    const text = normalizeWhitespace(el?.textContent)
    if (text) return text
  }
  return ""
}

function queryAllText(selector: string): string[] {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => normalizeWhitespace(el.textContent))
    .filter(Boolean)
}

// Parse "Jan 2020", "2020", "Present" → ISO date or null
function parseLinkedInDate(str: string): string | null {
  if (!str || str === "Present" || str === "–" || str === "-") return null

  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12"
  }

  // "Jan 2020" or "January 2020"
  const monthYearMatch = str.match(/([A-Za-z]+)\s+(\d{4})/)
  if (monthYearMatch) {
    const month = monthMap[monthYearMatch[1].substring(0, 3)] || "01"
    return `${monthYearMatch[2]}-${month}-01`
  }

  // Just year "2020"
  const yearMatch = str.match(/^(\d{4})$/)
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`
  }

  return null
}

// Strip duration suffixes like "· 4 yrs 2 mos", "• 3 mos", "(2 years)", trailing "yrs"/"mos"
function stripDurationSuffix(s: string): string {
  return s
    .replace(/[·•]\s*[\d\w\s]+(?:yr|yrs|mo|mos)\b.*/i, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b\d+\s*(?:yr|yrs|mo|mos)\b.*/i, "")
    .trim()
}

// Parse date range like "Jan 2020 – Present" or "2018 – 2022 · 4 yrs"
function parseDateRange(text: string): {
  startDate: string
  endDate: string | null
} {
  const parts = text.split(/\s*[–—-]\s*/)
  const startDate = parseLinkedInDate(stripDurationSuffix(parts[0] ?? "")) || ""
  const endDate = parts[1]
    ? parseLinkedInDate(stripDurationSuffix(parts[1]))
    : null
  return { startDate, endDate }
}

function extractFromJsonLd(): Partial<UserProfile> | null {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  )
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "")
      if (data["@type"] === "Person") {
        const result: Partial<UserProfile> = {
          personalInfo: {
            fullName: data.name || "",
            email: "",
            phone: "",
            location: "",
            summary: data.description || "",
            linkedin: data.sameAs || data.url || "",
            github: "",
            website: ""
          }
        }

        // Extract work experience from worksFor
        if (data.worksFor) {
          const works = Array.isArray(data.worksFor)
            ? data.worksFor
            : [data.worksFor]
          result.workExperience = works.map((w: any) => ({
            id: crypto.randomUUID(),
            jobTitle: "",
            company: w.name || "",
            startDate: "",
            endDate: null,
            achievements: []
          }))
        }

        // Extract education from alumniOf
        if (data.alumniOf) {
          const schools = Array.isArray(data.alumniOf)
            ? data.alumniOf
            : [data.alumniOf]
          result.education = schools.map((s: any) => ({
            id: crypto.randomUUID(),
            degree: "",
            institution: s.name || "",
            fieldOfStudy: "",
            startDate: "",
            endDate: null,
            description: ""
          }))
        }

        return result
      }
    } catch {
      // ignore parse errors
    }
  }
  return null
}

function extractFromDom(): Partial<UserProfile> {
  const result: Partial<UserProfile> = {}

  // Personal Info
  const fullName = queryText([
    "h1.text-heading-xlarge",
    "h1[class*='heading']",
    ".pv-top-card--list h1"
  ])

  const summary = queryText([
    "#about ~ div span[aria-hidden='true']",
    "#about + div span[aria-hidden='true']",
    ".pv-about__summary-text",
    ".pv-shared-text-with-see-more span[aria-hidden='true']"
  ])

  const location = queryText([
    ".text-body-small.inline.t-black--light.break-words",
    ".pv-top-card--list-bullet li",
    ".pv-top-card-v2-ctas ~ .pv-top-card--list .text-body-small"
  ])

  const linkedinUrl = window.location.href.split("?")[0].replace(/\/$/, "")

  result.personalInfo = {
    fullName,
    email: "",
    phone: "",
    location,
    summary,
    linkedin: linkedinUrl,
    github: "",
    website: ""
  }

  // Work Experience
  const expItems = document.querySelectorAll(
    "#experience ~ div .pvs-list__item--line-separated, #experience + div .pvs-list__item--line-separated"
  )

  if (expItems.length > 0) {
    result.workExperience = []
    expItems.forEach((item) => {
      const jobTitle = normalizeWhitespace(
        item.querySelector("span[aria-hidden='true']")?.textContent
      )
      const company = normalizeWhitespace(
        item.querySelectorAll("span[aria-hidden='true']")[1]?.textContent
      )
      const dateText = normalizeWhitespace(
        item.querySelector(
          ".pvs-entity__caption-wrapper span[aria-hidden='true']"
        )?.textContent ||
          item.querySelectorAll("span[aria-hidden='true']")[2]?.textContent
      )
      const description = normalizeWhitespace(
        item.querySelector(
          ".pvs-list__item--no-padding-in-columns span[aria-hidden='true']"
        )?.textContent
      )

      const { startDate, endDate } = parseDateRange(dateText)

      if (jobTitle || company) {
        result.workExperience!.push({
          id: crypto.randomUUID(),
          jobTitle: jobTitle || "",
          company: company?.split(" · ")[0] || "",
          startDate,
          endDate,
          achievements: description ? [description] : []
        })
      }
    })
  }

  // Education
  const eduItems = document.querySelectorAll(
    "#education ~ div .pvs-list__item--line-separated, #education + div .pvs-list__item--line-separated"
  )

  if (eduItems.length > 0) {
    result.education = []
    eduItems.forEach((item) => {
      const spans = item.querySelectorAll("span[aria-hidden='true']")
      const institution = normalizeWhitespace(spans[0]?.textContent)
      const degreeField = normalizeWhitespace(spans[1]?.textContent)
      const dateText = normalizeWhitespace(spans[2]?.textContent)

      // Split "Master's degree, Computer Science" or just "Bachelor"
      const degreeParts = degreeField?.split(",") || []
      const degree = degreeParts[0]?.trim() || ""
      const fieldOfStudy = degreeParts[1]?.trim() || ""

      const { startDate, endDate } = parseDateRange(dateText)

      if (institution || degree) {
        result.education!.push({
          id: crypto.randomUUID(),
          degree,
          institution,
          fieldOfStudy,
          startDate,
          endDate,
          description: ""
        })
      }
    })
  }

  // Skills
  const skillItems = document.querySelectorAll(
    "#skills ~ div .pvs-list__item--line-separated, #skills + div .pvs-list__item--line-separated"
  )

  if (skillItems.length > 0) {
    result.skills = []
    skillItems.forEach((item) => {
      const name = normalizeWhitespace(
        item.querySelector("span[aria-hidden='true']")?.textContent
      )
      if (name) {
        result.skills!.push({
          id: crypto.randomUUID(),
          name,
          yearsOfExperience: 0
        })
      }
    })
  }

  // Languages
  const langItems = document.querySelectorAll(
    "#languages ~ div .pvs-list__item--line-separated, #languages + div .pvs-list__item--line-separated"
  )

  if (langItems.length > 0) {
    result.languages = []
    langItems.forEach((item) => {
      const spans = item.querySelectorAll("span[aria-hidden='true']")
      const name = normalizeWhitespace(spans[0]?.textContent)
      const level = normalizeWhitespace(spans[1]?.textContent)
      if (name) {
        result.languages!.push({
          id: crypto.randomUUID(),
          name,
          level: level || "Professional"
        })
      }
    })
  }

  return result
}

function mergeProfiles(
  jsonLd: Partial<UserProfile> | null,
  dom: Partial<UserProfile>
): Partial<UserProfile> {
  if (!jsonLd) return dom

  const merged: Partial<UserProfile> = { ...dom }

  // Use JSON-LD data where DOM data is empty
  if (jsonLd.personalInfo) {
    merged.personalInfo = {
      ...dom.personalInfo!,
      fullName:
        dom.personalInfo?.fullName || jsonLd.personalInfo.fullName || "",
      summary: dom.personalInfo?.summary || jsonLd.personalInfo.summary || ""
    }
  }

  // Prefer DOM experience (more detailed), fall back to JSON-LD
  if (!merged.workExperience?.length && jsonLd.workExperience?.length) {
    merged.workExperience = jsonLd.workExperience
  }

  if (!merged.education?.length && jsonLd.education?.length) {
    merged.education = jsonLd.education
  }

  return merged
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getLinkedInProfile") {
    try {
      const jsonLdData = extractFromJsonLd()
      const domData = extractFromDom()
      const merged = mergeProfiles(jsonLdData, domData)
      sendResponse({ success: true, data: merged })
    } catch (err) {
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error"
      })
    }
    return true
  }
  return true
})

import { afterEach, describe, expect, it, vi } from "vitest"

import { parseCompanyInfo } from "./companyResearchParser"

describe("company research parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accepts fenced JSON, alternate field names, citations, and string projects", () => {
    const result = parseCompanyInfo(`\`\`\`json
{
  "Industry/Sector": "Fintech [1]",
  "Company size (employees)": "250 [2]",
  "Brief description": "Payments platform [3]",
  "Notable projects, products, or services": "- Checkout [4]\\n- Fraud detection [5]",
  "Glassdoor Rating": "4.2",
  "ratings": { "indeed": 4.1, "teamlyzer": 7 }
}
\`\`\``)

    expect(result).toEqual({
      industry: "Fintech",
      size: "250",
      description: "Payments platform",
      notableProjects: ["Checkout", "Fraud detection"],
      ratings: { glassdoor: 4.2, indeed: 4.1, teamlyzer: undefined },
      sources: []
    })
  })

  it("keeps only usable project strings and caps the list", () => {
    const result = parseCompanyInfo(
      JSON.stringify({
        industry: "Software",
        projects: [
          "One",
          "Project two",
          42,
          "Project three",
          "Project four",
          "Project five",
          "Project six",
          "Project seven"
        ]
      })
    )

    expect(result.notableProjects).toEqual([
      "Project two",
      "Project three",
      "Project four",
      "Project five",
      "Project six",
      "Project seven"
    ])
  })

  it("returns safe defaults for malformed model output", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = parseCompanyInfo("not json")

    expect(result).toEqual({
      industry: "Not available",
      size: "Not available",
      description: "Not available",
      notableProjects: [],
      ratings: {
        glassdoor: undefined,
        indeed: undefined,
        teamlyzer: undefined
      },
      sources: []
    })
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

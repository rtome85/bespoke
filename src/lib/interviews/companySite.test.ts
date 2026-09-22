import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  companyOriginFrom,
  fetchCompanyPages,
  htmlTitle,
  htmlToText,
  isJobBoard
} from "./companySite"

const fetchMock = vi.fn()

const longHtml = (title: string, body: string) =>
  `<html><head><title>${title}</title></head><body><main><h1>${body}</h1><p>${"Useful company information. ".repeat(12)}</p></main></body></html>`

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("company site URL helpers", () => {
  it("recognizes job boards and their subdomains", () => {
    expect(isJobBoard("www.linkedin.com")).toBe(true)
    expect(isJobBoard("jobs.eu.greenhouse.io")).toBe(true)
    expect(isJobBoard("careers.acme.test")).toBe(false)
  })

  it("derives and upgrades an employer origin", () => {
    expect(
      companyOriginFrom(" http://careers.acme.test:8080/jobs/123?q=engineer ")
    ).toBe("https://careers.acme.test:8080")
  })

  it("rejects job boards, unsupported protocols, and malformed URLs", () => {
    expect(companyOriginFrom("https://linkedin.com/jobs/123")).toBeUndefined()
    expect(companyOriginFrom("ftp://acme.test/jobs")).toBeUndefined()
    expect(companyOriginFrom("not a url")).toBeUndefined()
    expect(companyOriginFrom()).toBeUndefined()
  })
})

describe("company site HTML helpers", () => {
  it("extracts readable text while removing executable and decorative content", () => {
    const html = `
      <style>.hidden { display: none }</style>
      <script>alert("no")</script>
      <svg><text>logo</text></svg>
      <!-- comment -->
      <h1>Acme &amp; Co</h1>
      <p>Builds&nbsp;tools &lt;globally&gt;.</p>
      <div>Trusted &quot;partner&quot; &#39;today&#39;.</div>
    `

    expect(htmlToText(html)).toBe(
      "Acme & Co\n\nBuilds tools <globally>.\n\nTrusted \"partner\" 'today'."
    )
  })

  it("extracts and caps a document title", () => {
    expect(htmlTitle(`<title> Acme &amp; Co </title>`)).toBe("Acme & Co")
    expect(htmlTitle("<main>No title</main>")).toBe("")
    expect(htmlTitle(`<title>${"x".repeat(250)}</title>`)).toHaveLength(200)
  })
})

describe("fetchCompanyPages", () => {
  it("keeps distinct readable HTML pages and skips duplicates and failures", async () => {
    const home = longHtml("Acme", "Home")
    const careers = longHtml("Careers", "Join us")
    fetchMock
      .mockResolvedValueOnce(
        new Response(home, {
          status: 200,
          headers: { "Content-Type": "text/html" }
        })
      )
      .mockResolvedValueOnce(
        new Response(home, {
          status: 200,
          headers: { "Content-Type": "text/html" }
        })
      )
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(careers, {
          status: 200,
          headers: { "Content-Type": "application/xhtml+xml" }
        })
      )

    const pages = await fetchCompanyPages("https://acme.test", 2)

    expect(pages).toHaveLength(2)
    expect(pages.map((page) => page.url)).toEqual([
      "https://acme.test/",
      "https://acme.test/careers"
    ])
    expect(pages.map((page) => page.title)).toEqual(["Acme", "Careers"])
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("drops non-HTML and client-rendered shells", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValue(
        new Response("<html><body>Short shell</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" }
        })
      )

    await expect(fetchCompanyPages("https://acme.test", 1)).resolves.toEqual([])
  })

  it("treats transport failures as unavailable pages", async () => {
    fetchMock.mockRejectedValue(new Error("offline"))

    await expect(fetchCompanyPages("https://acme.test", 1)).resolves.toEqual([])
  })
})

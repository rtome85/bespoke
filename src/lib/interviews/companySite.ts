/**
 * The zero-config half of company research: read the company's own pages.
 *
 * The service worker can fetch cross-origin without CORS, so when we know a
 * company's domain we can read what they say about themselves without any
 * search account at all. We only ever learn that domain from a job posting
 * URL the user already saved — guessing `<company>.com` from a name lands on
 * squatters and namesakes often enough that a wrong answer is worse than none.
 */

const PAGE_TIMEOUT_MS = 12_000

/** Characters of extracted text kept per page, before the synthesis call. */
const PER_PAGE_CHARS = 6_000

/**
 * Hosts that publish *other* companies' jobs. A posting on one of these tells
 * us nothing about the employer's own site, so they never seed a fetch.
 */
const JOB_BOARDS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "glassdoor.co.uk",
  "monster.com",
  "ziprecruiter.com",
  "dice.com",
  "wellfound.com",
  "angel.co",
  "otta.com",
  "welcometothejungle.com",
  "workable.com",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "myworkdayjobs.com",
  "workday.com",
  "smartrecruiters.com",
  "recruitee.com",
  "personio.de",
  "teamtailor.com",
  "jobvite.com",
  "icims.com",
  "taleo.net",
  "bamboohr.com",
  "breezy.hr",
  "net-empregos.com",
  "itjobs.pt",
  "landing.jobs",
  "sapo.pt",
  "stepstone.com",
  "xing.com",
  "seek.com.au",
  "reed.co.uk",
  "totaljobs.com",
  "eures.europa.eu"
]

/** Paths worth reading on a company site, best first. */
const CANDIDATE_PATHS = ["/", "/about", "/about-us", "/careers", "/company"]

export interface FetchedPage {
  url: string
  title: string
  text: string
}

const stripWww = (host: string) => host.replace(/^www\./i, "")

/** Is this host a job board rather than an employer's own site? */
export function isJobBoard(host: string): boolean {
  const h = stripWww(host).toLowerCase()
  return JOB_BOARDS.some((b) => h === b || h.endsWith(`.${b}`))
}

/**
 * The company's own origin, derived from a saved job posting URL. Returns
 * undefined for job boards and for anything that isn't a parseable https URL —
 * both mean "we don't know their domain", which the caller treats as "this
 * strategy is unavailable" rather than as a failure.
 */
export function companyOriginFrom(jobUrl?: string): string | undefined {
  if (!jobUrl?.trim()) return undefined
  try {
    const url = new URL(jobUrl.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    if (isJobBoard(url.host)) return undefined
    return `${url.protocol}//${url.host}`
  } catch {
    return undefined
  }
}

/**
 * Reduce an HTML document to readable text. Deliberately regex-based: the
 * service worker has no DOM, and `DOMParser` is unavailable there.
 */
export function htmlToText(html: string): string {
  return (
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/[ \t ]+/g, " ")
      // Tags that become a newline sit next to tags that become a space, so
      // every line would otherwise start or end with stray padding.
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}

/** `<title>` of a document, for labelling the source in the prompt. */
export function htmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? htmlToText(m[1]).slice(0, 200) : ""
}

async function fetchPage(url: string): Promise<FetchedPage | undefined> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml" }
    })
    if (!res.ok) return undefined
    const type = res.headers.get("content-type") ?? ""
    if (type && !/text\/html|application\/xhtml/i.test(type)) return undefined
    const html = await res.text()
    const text = htmlToText(html).slice(0, PER_PAGE_CHARS)
    // A page that reduced to almost nothing is a shell rendered by JS; it
    // would contribute noise to the prompt and nothing else.
    if (text.length < 200) return undefined
    return { url, title: htmlTitle(html), text }
  } catch {
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Read what a company publishes about itself. Every page is best-effort and
 * independent — a 404 on `/about` must not lose the home page we already got.
 * Returns an empty array when the origin is unknown or nothing was readable.
 */
export async function fetchCompanyPages(
  origin: string,
  maxPages = 3
): Promise<FetchedPage[]> {
  const pages: FetchedPage[] = []
  for (const path of CANDIDATE_PATHS) {
    if (pages.length >= maxPages) break
    const page = await fetchPage(`${origin}${path}`)
    // The home page and `/about` on a single-page site are the same document;
    // keeping both would spend the prompt budget twice on one text.
    if (page && !pages.some((p) => p.text === page.text)) pages.push(page)
  }
  return pages
}

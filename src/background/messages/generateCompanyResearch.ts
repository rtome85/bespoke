import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient, type ChatMessage } from "~api/llm"
import { PerplexityClient } from "~api/perplexityClient"
import {
  searchConfigured,
  searchWeb,
  type SearchResult
} from "~api/searchClient"
import {
  resolveJobRoute,
  type ResolvedRoute
} from "~background/prepareGenerateRequest"
import { parseCompanyInfo } from "~lib/companyResearchParser"
import { hasHostPermission } from "~lib/hostPermissions"
import {
  companyInfoToMarkdown,
  readCompanyResearch,
  writeCompanyResearch
} from "~lib/interviews/companyResearch"
import {
  companyOriginFrom,
  fetchCompanyPages,
  type FetchedPage
} from "~lib/interviews/companySite"
import type { CompanyInfo, CompanyResearchEntry } from "~types/companyResearch"
import {
  DEFAULT_COMPANY_SYNTHESIS_PROMPT,
  DEFAULT_LLM_TUNING,
  normalizeModelRouting,
  RESEARCH_PREFERENCE_LABELS,
  type LLMTuningConfig,
  type ModelRouting,
  type PerplexityConfig,
  type ResearchPreference,
  type ResearchSource,
  type SearchConfig
} from "~types/config"

interface Body {
  company: string
  /** A saved posting URL; the only way we learn the company's own domain. */
  jobUrl?: string
  force?: boolean
}

/** Characters of source text handed to the synthesis call. */
const SOURCE_BUDGET = 14_000

interface Researched {
  info: CompanyInfo
  /** Rendered markdown. Never empty — see `asResearched`. */
  text: string
  source: ResearchSource
  sourceUrls: string[]
}

/**
 * A result, or `undefined` when the parse produced nothing worth showing.
 *
 * Rendering is the test: `companyInfoToMarkdown` drops blank and
 * "Not available" fields, so an empty render means the source answered with
 * nothing usable. Rejecting it here rather than downstream is what keeps the
 * fallback chain walking — a source that returns unparseable JSON would
 * otherwise satisfy `if (researched) break` and strand every source behind it.
 */
function asResearched(
  info: CompanyInfo,
  source: ResearchSource,
  sourceUrls: string[]
): Researched | undefined {
  const text = companyInfoToMarkdown(info)
  return text ? { info, text, source, sourceUrls } : undefined
}

/**
 * Turn raw web text into the shared `CompanyInfo` shape. Runs on the `prep`
 * route — the same model the user picked for interview prep, since this is
 * summarisation feeding exactly that.
 */
async function synthesize(
  company: string,
  sources: string,
  urls: string[],
  source: ResearchSource
): Promise<Researched | undefined> {
  const route = await resolveJobRoute("prep")
  if ("error" in route) throw new Error(route.error)

  const { llmTuning } = (await chrome.storage.local.get("llmTuning")) as {
    llmTuning?: LLMTuningConfig
  }
  const tuning = llmTuning ?? DEFAULT_LLM_TUNING

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a company research assistant. Return only valid JSON, no markdown."
    },
    {
      role: "user",
      content: DEFAULT_COMPANY_SYNTHESIS_PROMPT.replace(
        /\{\{companyName\}\}/g,
        company
      ).replace(/\{\{sources\}\}/g, sources.slice(0, SOURCE_BUDGET))
    }
  ]

  const run = async (r: ResolvedRoute): Promise<string> => {
    const client = getLLMClient(r.provider, r.clientConfig)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)
    try {
      return await client.chat({
        model: r.model,
        messages,
        temperature: Math.min(tuning.temperature, 0.4),
        topP: tuning.topP,
        maxTokens: 900,
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  let content: string
  try {
    content = await run(route.primary)
  } catch (err) {
    if (!route.fallback) throw err
    content = await run(route.fallback)
  }

  return asResearched(parseCompanyInfo(content), source, urls)
}

/** Which source the user pinned research to on the Model routing page. */
async function loadResearchPreference(): Promise<ResearchPreference> {
  const { modelRouting } = (await chrome.storage.local.get("modelRouting")) as {
    modelRouting?: ModelRouting
  }
  return modelRouting
    ? normalizeModelRouting(modelRouting).research ?? "auto"
    : "auto"
}

const formatResults = (results: SearchResult[]): string =>
  results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join("\n\n")

const formatPages = (pages: FetchedPage[]): string =>
  pages
    .map((p) => `--- ${p.title || p.url} (${p.url}) ---\n${p.text}`)
    .join("\n\n")

/**
 * Company research for the Prep workspace and the match report, cached per
 * company in `companyResearchCache`.
 *
 * Four sources, tried in order, each falling through to the next on failure so
 * research never hard-fails on one unconfigured account:
 *
 * 1. **Perplexity** — search-grounded, one call, when the account is connected.
 * 2. **Web search** — the configured engine's snippets, synthesised locally.
 * 3. **The company's own site** — free and keyless, when a saved posting URL
 *    tells us their domain.
 * 4. **Model knowledge** — flagged as unverified, because a model's
 *    recollection of a company is exactly the kind of thing that is confidently
 *    wrong.
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = (req.body ?? {}) as Body
  const company = (body.company ?? "").trim()

  if (!company) {
    res.send({ success: false, message: "No company given." })
    return
  }

  try {
    const routing = await loadResearchPreference()

    if (!body.force) {
      const cached = await readCompanyResearch(company)
      // A pinned preference governs the cache too: reusing an entry from a
      // different source would quietly serve what the user just excluded —
      // "web search only" answering from model knowledge, provenance line and
      // all. Entries written before `source` existed all came from Perplexity.
      const fromPinnedSource =
        routing === "auto" || (cached?.source ?? "perplexity") === routing
      if (cached && fromPinnedSource) {
        res.send({ success: true, cached: true, entry: cached })
        return
      }
    }

    const { perplexityConfig, searchConfig } = (await chrome.storage.local.get([
      "perplexityConfig",
      "searchConfig"
    ])) as {
      perplexityConfig?: PerplexityConfig
      searchConfig?: SearchConfig
    }

    // Why each source was skipped, so a failure can say what to connect
    // rather than just "research failed".
    const attempts: string[] = []
    /** Origin the user could grant to unlock site research, for the UI prompt. */
    let needsHostPermission: string | undefined

    const note = (source: string, error: unknown) =>
      attempts.push(
        `${source}: ${error instanceof Error ? error.message : String(error)}`
      )

    const viaPerplexity = async (): Promise<Researched | undefined> => {
      if (!perplexityConfig?.enabled || !perplexityConfig?.apiKey) {
        attempts.push("Perplexity: not connected")
        return undefined
      }
      try {
        const info = await new PerplexityClient(
          perplexityConfig
        ).fetchCompanyInfo(company)
        const result = asResearched(info, "perplexity", [])
        if (!result) attempts.push("Perplexity: nothing usable in the reply")
        return result
      } catch (error) {
        note("Perplexity", error)
        return undefined
      }
    }

    const viaSearch = async (): Promise<Researched | undefined> => {
      if (!searchConfigured(searchConfig)) {
        attempts.push("Web search: not connected")
        return undefined
      }
      try {
        const results = await searchWeb(
          searchConfig,
          `${company} company — what they do, products, size, industry`,
          6
        )
        if (!results.length) {
          attempts.push("Web search: no results")
          return undefined
        }
        const result = await synthesize(
          company,
          formatResults(results),
          results.map((r) => r.url),
          "search"
        )
        if (!result) attempts.push("Web search: nothing usable in the results")
        return result
      } catch (error) {
        note("Web search", error)
        return undefined
      }
    }

    const viaSite = async (): Promise<Researched | undefined> => {
      const origin = companyOriginFrom(body.jobUrl)
      if (!origin) {
        attempts.push("Company site: no company URL on this application")
        return undefined
      }
      if (!(await hasHostPermission(origin))) {
        // The UI asks for this grant on a click; the worker has no gesture to
        // request it with, so it reports the need and moves on.
        needsHostPermission = origin
        attempts.push(`${origin}: not allowed yet`)
        return undefined
      }
      try {
        const pages = await fetchCompanyPages(origin)
        if (!pages.length) {
          attempts.push(`${origin}: nothing readable`)
          return undefined
        }
        const result = await synthesize(
          company,
          formatPages(pages),
          pages.map((p) => p.url),
          "site"
        )
        if (!result) attempts.push(`${origin}: nothing usable on those pages`)
        return result
      } catch (error) {
        note("Company site", error)
        return undefined
      }
    }

    const viaModel = async (): Promise<Researched | undefined> => {
      try {
        const result = await synthesize(
          company,
          `(No web sources were available. Answer from what you already know about ${company}, and use "Not available" wherever you are unsure.)`,
          [],
          "model"
        )
        if (!result) attempts.push("Model knowledge: nothing usable")
        return result
      } catch (error) {
        note("Model knowledge", error)
        return undefined
      }
    }

    const SOURCES: Record<
      ResearchSource,
      () => Promise<Researched | undefined>
    > = {
      perplexity: viaPerplexity,
      search: viaSearch,
      site: viaSite,
      model: viaModel
    }

    // `auto` walks every source, best-grounded first; a named preference runs
    // only that one, so "use my search engine" cannot silently answer from the
    // model's memory instead.
    const order: ResearchSource[] =
      routing === "auto" ? ["perplexity", "search", "site", "model"] : [routing]

    let researched: Researched | undefined
    for (const source of order) {
      researched = await SOURCES[source]()
      if (researched) break
    }

    if (!researched) {
      // A pinned source that failed is one problem to fix; `auto` exhausting
      // everything is a different message, because the fix is to connect
      // something rather than to repair what is already chosen.
      const why = attempts.join(" · ")
      res.send({
        success: false,
        message:
          routing === "auto"
            ? `Couldn't research this company. ${why}`
            : `Company research is set to ${RESEARCH_PREFERENCE_LABELS[routing]} on the Model routing page, and that failed. ${why}`,
        needsHostPermission
      })
      return
    }

    const entry: CompanyResearchEntry = {
      text: researched.text,
      parsed: researched.info,
      generatedAt: new Date().toISOString(),
      source: researched.source,
      sourceUrls: researched.sourceUrls
    }
    await writeCompanyResearch(company, entry)
    res.send({ success: true, cached: false, entry, needsHostPermission })
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : "Research failed."
    })
  }
}

export default handler

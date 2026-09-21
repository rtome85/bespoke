import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import type { CompanyInfo } from "~api/perplexityClient"
import type { CompanyResearchEntry } from "~lib/interviews/companyResearch"

/**
 * Company research for the match report.
 *
 * Routed through the `generateCompanyResearch` worker rather than calling
 * Perplexity from the panel: the source is whatever the user picked under
 * Model routing → Company research (`auto`, web search, the company's own
 * site, model knowledge), and the worker owns the fallback chain and the
 * per-company cache. Calling Perplexity directly left the card blank for
 * everyone whose research runs on any other source.
 *
 * A failure is reported rather than swallowed — a silently empty card is
 * indistinguishable from research being switched off.
 */
export function useCompanyResearch(
  companyName: string,
  hasMatchResult: boolean,
  jobUrl: string
) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false)
  const [companyInfoError, setCompanyInfoError] = useState("")

  useEffect(() => {
    if (!hasMatchResult || !companyName.trim()) {
      setCompanyInfo(null)
      setCompanyInfoLoading(false)
      setCompanyInfoError("")
      return
    }

    let active = true

    const fetchCompanyInfo = async () => {
      setCompanyInfoLoading(true)
      setCompanyInfo(null)
      setCompanyInfoError("")

      try {
        const response = await sendToBackground({
          name: "generateCompanyResearch",
          body: { company: companyName, jobUrl }
        })
        if (!active) return

        if (!response?.success) {
          setCompanyInfo(null)
          setCompanyInfoError(
            response?.message ?? "Couldn't research this company."
          )
          return
        }

        // The card renders structured fields, so an entry cached before the
        // parsed form existed has nothing for it to draw.
        const entry = response.entry as CompanyResearchEntry | undefined
        setCompanyInfo(entry?.parsed ?? null)
      } catch (error) {
        if (active) {
          setCompanyInfo(null)
          setCompanyInfoError(
            error instanceof Error
              ? error.message
              : "Couldn't research this company."
          )
        }
      } finally {
        if (active) setCompanyInfoLoading(false)
      }
    }

    void fetchCompanyInfo()

    return () => {
      active = false
    }
  }, [companyName, hasMatchResult, jobUrl])

  return { companyInfo, companyInfoLoading, companyInfoError }
}

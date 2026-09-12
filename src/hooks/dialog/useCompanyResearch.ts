import { useEffect, useState } from "react"

import type { CompanyInfo } from "~api/perplexityClient"
import { parseCompanyInfo } from "~lib/dialog/companyResearchParser"
import { seedCompanyResearch } from "~lib/interviews/companyResearch"
import type { PerplexityConfig } from "~types/config"

export function useCompanyResearch(
  companyName: string,
  hasMatchResult: boolean,
  config: PerplexityConfig | null
) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false)

  useEffect(() => {
    if (!hasMatchResult || !companyName || !config?.enabled || !config.apiKey) {
      setCompanyInfo(null)
      setCompanyInfoLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    let active = true

    const fetchCompanyInfo = async () => {
      setCompanyInfoLoading(true)
      setCompanyInfo(null)

      try {
        const response = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a company research assistant. Always respond with valid JSON only, no markdown formatting."
                },
                {
                  role: "user",
                  content: config.customPrompt.replace(
                    /\{\{companyName\}\}/g,
                    companyName
                  )
                }
              ],
              max_tokens: 800,
              temperature: 0.2
            }),
            signal: controller.signal
          }
        )

        if (!response.ok) {
          if (active) setCompanyInfo(null)
          return
        }

        const data = await response.json()
        const content = data.choices?.[0]?.["message"]?.["content"] || ""
        const info = parseCompanyInfo(content)
        if (!active) return
        setCompanyInfo(info)
        void seedCompanyResearch(companyName, info)
      } catch (error) {
        if (active) {
          setCompanyInfo(null)
          console.error("Failed to fetch company info:", error)
        }
      } finally {
        clearTimeout(timeout)
        if (active) setCompanyInfoLoading(false)
      }
    }

    void fetchCompanyInfo()

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [companyName, config, hasMatchResult])

  return { companyInfo, companyInfoLoading }
}

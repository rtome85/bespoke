import type { PlasmoMessaging } from "@plasmohq/messaging"

import { PerplexityClient } from "~api/perplexityClient"
import {
  companyInfoToMarkdown,
  readCompanyResearch,
  writeCompanyResearch,
  type CompanyResearchEntry
} from "~lib/interviews/companyResearch"
import type { PerplexityConfig } from "~types/config"

// Company-level research for the Prep workspace. Cached in
// `companyResearchCache` and reused across every round for that company; only
// a miss or an explicit `force` refresh hits Perplexity.
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const company: string = (req.body?.company ?? "").trim()
  const force: boolean = !!req.body?.force

  if (!company) {
    res.send({ success: false, message: "No company given." })
    return
  }

  try {
    if (!force) {
      const cached = await readCompanyResearch(company)
      if (cached) {
        res.send({ success: true, cached: true, entry: cached })
        return
      }
    }

    const { perplexityConfig } = (await chrome.storage.local.get(
      "perplexityConfig"
    )) as { perplexityConfig?: PerplexityConfig }

    if (!perplexityConfig?.enabled || !perplexityConfig?.apiKey) {
      res.send({
        success: false,
        message:
          "Perplexity isn't configured. Connect it on the Providers page to research companies."
      })
      return
    }

    const info = await new PerplexityClient(perplexityConfig).fetchCompanyInfo(
      company
    )
    const text = companyInfoToMarkdown(info)

    if (!text) {
      res.send({
        success: false,
        message: "Couldn't find anything useful for this company."
      })
      return
    }

    const entry: CompanyResearchEntry = {
      text,
      parsed: info,
      generatedAt: new Date().toISOString()
    }
    await writeCompanyResearch(company, entry)
    res.send({ success: true, cached: false, entry })
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : "Research failed."
    })
  }
}

export default handler

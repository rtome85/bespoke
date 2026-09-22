import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient } from "~api/llm"
import { LLMService } from "~api/llmService"
import {
  prepareGenerateRequest,
  type ResolvedRoute
} from "~background/prepareGenerateRequest"

// Step 1 of the two-step flow: fast match analysis only. Document
// generation happens later via generateDocuments, once the user has
// seen the score and decided to proceed. PENDING_JOB_DATA is kept so
// the follow-up request can still fall back to it.
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const prepared = await prepareGenerateRequest(req.body, "scoring")

    if (prepared.ok === false) {
      res.send({ success: false, message: prepared.message })
      return
    }

    const run = (route: ResolvedRoute) => {
      const service = new LLMService(
        getLLMClient(route.provider, route.clientConfig)
      )
      return service.analyzeMatch({ ...prepared.request, model: route.model })
    }

    let match
    try {
      match = await run(prepared.primary)
    } catch (err) {
      if (!prepared.fallback) throw err
      match = await run(prepared.fallback)
    }

    res.send({
      success: true,
      message: "Match analysis complete!",
      data: { match }
    })
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
}

export default handler

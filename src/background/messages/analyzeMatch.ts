import type { PlasmoMessaging } from "@plasmohq/messaging"

import { OllamaClient } from "~api/ollamaClient"
import { prepareGenerateRequest } from "~background/prepareGenerateRequest"

// Step 1 of the two-step flow: fast match analysis only. Document
// generation happens later via generateDocuments, once the user has
// seen the score and decided to proceed. PENDING_JOB_DATA is kept so
// the follow-up request can still fall back to it.
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const prepared = await prepareGenerateRequest(req.body)

    if (prepared.ok === false) {
      res.send({ success: false, message: prepared.message })
      return
    }

    const client = new OllamaClient(prepared.ollamaConfig)
    const match = await client.analyzeMatch(prepared.request)

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

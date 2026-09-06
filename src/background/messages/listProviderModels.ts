import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient } from "~api/llm"
import { PROVIDER_META, type LLMProviderId } from "~types/config"

/** Fetches the selectable model ids for a provider account. */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { provider, apiKey, baseUrl } = req.body as {
    provider: LLMProviderId
    apiKey?: string
    baseUrl?: string
  }

  const meta = PROVIDER_META[provider]
  if (!meta) {
    res.send({ success: false, message: "Unknown provider", models: [] })
    return
  }

  try {
    const client = getLLMClient(provider, { apiKey: apiKey ?? "", baseUrl })
    const models = await client.listModels()
    res.send({
      success: true,
      models: models.length ? models : meta.fallbackModels
    })
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : "Failed to list models",
      models: meta.fallbackModels
    })
  }
}

export default handler

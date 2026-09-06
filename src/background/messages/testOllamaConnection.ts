import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient } from "~api/llm"
import { PROVIDER_META, type LLMProviderId } from "~types/config"

/**
 * Connection test for any provider. Kept under the old message name for
 * back-compat; callers may now pass `provider` ("ollama" default).
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const {
    apiKey,
    baseUrl,
    provider = "ollama"
  } = req.body as {
    apiKey?: string
    baseUrl?: string
    provider?: LLMProviderId
  }

  const meta = PROVIDER_META[provider] ?? PROVIDER_META.ollama

  if (!meta.local && !apiKey) {
    res.send({ success: false, message: "Please enter an API key first" })
    return
  }

  try {
    const client = getLLMClient(provider, { apiKey: apiKey ?? "", baseUrl })
    const ok = await client.testConnection()
    res.send(
      ok
        ? { success: true, message: `${meta.name} connection successful.` }
        : {
            success: false,
            message: `${meta.name} connection failed. Check the key and URL.`
          }
    )
  } catch (error) {
    res.send({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Connection failed. Check your internet connection."
    })
  }
}

export default handler

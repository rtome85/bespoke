import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient } from "~api/llm"
import {
  hasProviderCredential,
  missingCredentialMessage,
  PROVIDER_META,
  type LLMProviderId
} from "~types/config"

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

  const id = PROVIDER_META[provider] ? provider : "ollama"
  const meta = PROVIDER_META[id]

  if (!hasProviderCredential(id, { apiKey: apiKey ?? "", baseUrl })) {
    res.send({ success: false, message: missingCredentialMessage(id) })
    return
  }

  try {
    const client = getLLMClient(id, { apiKey: apiKey ?? "", baseUrl })
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

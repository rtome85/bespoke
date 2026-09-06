import type { LLMProviderId, ProviderConfig } from "~types/config"

import { AnthropicAdapter } from "./anthropic"
import { GoogleAdapter } from "./google"
import { OllamaAdapter } from "./ollama"
import { OpenAIAdapter } from "./openai"
import type { LLMClient } from "./types"

export type { ChatMessage, ChatOptions, LLMClient } from "./types"

/** Build the provider-specific client for a job's route target. */
export function getLLMClient(
  provider: LLMProviderId,
  config: Pick<ProviderConfig, "apiKey" | "baseUrl">
): LLMClient {
  const { apiKey = "", baseUrl } = config
  switch (provider) {
    case "openai":
      return new OpenAIAdapter(apiKey, baseUrl)
    case "anthropic":
      return new AnthropicAdapter(apiKey, baseUrl)
    case "google":
      return new GoogleAdapter(apiKey, baseUrl)
    case "ollama":
    default:
      return new OllamaAdapter(apiKey, baseUrl)
  }
}

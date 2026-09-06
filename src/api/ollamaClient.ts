import type { OllamaConfig } from "~types/config"

import { LLMService } from "./llmService"
import { OllamaAdapter } from "./llm/ollama"

export type { GenerateRequest } from "./llmService"

/**
 * Back-compat shim — Ollama-bound LLMService. New call sites should route
 * through prepareGenerateRequest + getLLMClient instead of constructing
 * this directly.
 */
export class OllamaClient extends LLMService {
  constructor(config: OllamaConfig) {
    super(new OllamaAdapter(config.apiKey, config.baseUrl))
  }
}

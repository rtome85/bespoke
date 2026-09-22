export interface ChatMessage {
  role: "system" | "user"
  content: string
}

export interface ChatOptions {
  model: string
  messages: ChatMessage[]
  temperature: number
  topP: number
  maxTokens: number
  signal?: AbortSignal
}

/**
 * The provider-specific surface. Everything above this — prompt building,
 * profile formatting, JSON parsing — lives in LLMService and is shared.
 */
export interface LLMClient {
  /** Send a chat completion; resolve with the assistant's plain text. */
  chat(opts: ChatOptions): Promise<string>
  /** List selectable model ids for this account. */
  listModels(): Promise<string[]>
  /** True when the credentials/endpoint work. */
  testConnection(): Promise<boolean>
}

export function splitSystem(messages: ChatMessage[]): {
  system: string
  user: string
} {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
  const user = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n")
  return { system, user }
}

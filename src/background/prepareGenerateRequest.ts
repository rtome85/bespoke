import { STORAGE_KEYS } from "~storage/keys"
import type { GenerateRequest, OllamaConfig } from "~types/config"
import { DEFAULT_LLM_TUNING, DEFAULT_PROMPTS } from "~types/config"
import type { UserProfile } from "~types/userProfile"

interface MessageBody {
  companyName: string
  jobTitle: string
  model?: string
  userProfile?: UserProfile
  jobDescription?: string
}

type PrepareResult =
  | { ok: true; ollamaConfig: OllamaConfig; request: GenerateRequest }
  | { ok: false; message: string }

/**
 * Reads config from storage and builds the GenerateRequest shared by the
 * match-analysis and document-generation message handlers.
 */
export async function prepareGenerateRequest(
  body: MessageBody
): Promise<PrepareResult> {
  const storage = await new Promise<any>((resolve) => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.OLLAMA_CONFIG,
        STORAGE_KEYS.CUSTOM_PROMPTS,
        STORAGE_KEYS.LAST_SELECTED_MODEL,
        STORAGE_KEYS.PENDING_JOB_DATA,
        STORAGE_KEYS.LLM_TUNING
      ],
      resolve
    )
  })

  const ollamaConfig = storage[STORAGE_KEYS.OLLAMA_CONFIG]
  const customPrompts = storage[STORAGE_KEYS.CUSTOM_PROMPTS] || DEFAULT_PROMPTS
  const llmTuning = storage[STORAGE_KEYS.LLM_TUNING] || DEFAULT_LLM_TUNING
  const jobData = storage[STORAGE_KEYS.PENDING_JOB_DATA]
  const selectedModel =
    body.model ||
    storage[STORAGE_KEYS.LAST_SELECTED_MODEL] ||
    "gpt-oss:20b-cloud"

  if (!ollamaConfig?.apiKey) {
    return {
      ok: false,
      message: "Ollama API key not configured. Please set it in Settings."
    }
  }

  const effectiveJobDescription =
    body.jobDescription || jobData?.selectedText

  if (!effectiveJobDescription) {
    return {
      ok: false,
      message:
        "No job description found. Right-click on a job posting and select 'Check my match for this job'."
    }
  }

  return {
    ok: true,
    ollamaConfig,
    request: {
      jobDescription: effectiveJobDescription,
      companyName: body.companyName,
      jobTitle: body.jobTitle,
      model: selectedModel,
      prompts: customPrompts,
      userProfile: body.userProfile,
      llmTuning
    }
  }
}

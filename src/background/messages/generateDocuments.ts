import type { PlasmoMessaging } from "@plasmohq/messaging"

import { OllamaClient } from "~api/ollamaClient"
import { STORAGE_KEYS } from "~storage/keys"
import { DEFAULT_LLM_TUNING, DEFAULT_PROMPTS } from "~types/config"
import { type UserProfile } from "~types/userProfile"
import {
  formatMarkdownContent,
  generateFilename
} from "~utils/documentFormatter"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { companyName, jobTitle, model, userProfile, jobDescription: bodyJobDescription } = req.body

  try {
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
    const customPrompts =
      storage[STORAGE_KEYS.CUSTOM_PROMPTS] || DEFAULT_PROMPTS
    const llmTuning = storage[STORAGE_KEYS.LLM_TUNING] || DEFAULT_LLM_TUNING
    const jobData = storage[STORAGE_KEYS.PENDING_JOB_DATA]
    const selectedModel =
      model || storage[STORAGE_KEYS.LAST_SELECTED_MODEL] || "gpt-oss:20b-cloud"

    if (!ollamaConfig?.apiKey) {
      res.send({
        success: false,
        message: "Ollama API key not configured. Please set it in Settings."
      })
      return
    }

    const effectiveJobDescription = bodyJobDescription || jobData?.selectedText

    if (!effectiveJobDescription) {
      res.send({
        success: false,
        message:
          "No job description found. Right-click on a job posting and select 'Generate CV for this job'."
      })
      return
    }

    const client = new OllamaClient(ollamaConfig)
    const generatedAt = new Date()

    const generateRequest = {
      jobDescription: effectiveJobDescription,
      companyName,
      jobTitle,
      model: selectedModel,
      prompts: customPrompts,
      userProfile: userProfile as UserProfile,
      llmTuning
    }

    const { resume, coverLetter } = await client.generateResumeAndCoverLetter(generateRequest)
    const match = await client.analyzeMatch(generateRequest)

    const resumeFilename = generateFilename(
      "resume",
      companyName,
      jobTitle,
      generatedAt
    )
    const coverLetterFilename = generateFilename(
      "cover-letter",
      companyName,
      jobTitle,
      generatedAt
    )

    const resumeContent = formatMarkdownContent(
      resume,
      "resume",
      companyName,
      jobTitle,
      selectedModel,
      generatedAt
    )
    const coverLetterContent = formatMarkdownContent(
      coverLetter,
      "cover-letter",
      companyName,
      jobTitle,
      selectedModel,
      generatedAt
    )

    chrome.storage.local.remove([STORAGE_KEYS.PENDING_JOB_DATA])

    res.send({
      success: true,
      message: "Documents generated!",
      data: {
        resumeContent,
        resumeFilename,
        coverLetterContent,
        coverLetterFilename,
        match
      }
    })
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
}

export default handler

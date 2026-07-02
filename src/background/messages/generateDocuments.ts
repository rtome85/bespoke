import type { PlasmoMessaging } from "@plasmohq/messaging"

import { OllamaClient } from "~api/ollamaClient"
import { prepareGenerateRequest } from "~background/prepareGenerateRequest"
import { STORAGE_KEYS } from "~storage/keys"
import {
  formatMarkdownContent,
  generateFilename
} from "~utils/documentFormatter"

// Step 2 of the two-step flow: generates resume + cover letter after the
// user has reviewed the match analysis (see analyzeMatch).
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { companyName, jobTitle } = req.body

  try {
    const prepared = await prepareGenerateRequest(req.body)

    if (prepared.ok === false) {
      res.send({ success: false, message: prepared.message })
      return
    }

    const client = new OllamaClient(prepared.ollamaConfig)
    const generatedAt = new Date()

    const { resume, coverLetter } = await client.generateResumeAndCoverLetter(
      prepared.request
    )

    const selectedModel = prepared.request.model

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
        coverLetterFilename
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

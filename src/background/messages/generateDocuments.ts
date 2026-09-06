import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient } from "~api/llm"
import { LLMService } from "~api/llmService"
import {
  prepareGenerateRequest,
  type ResolvedRoute
} from "~background/prepareGenerateRequest"
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
    const prepared = await prepareGenerateRequest(req.body, "drafting")

    if (prepared.ok === false) {
      res.send({ success: false, message: prepared.message })
      return
    }

    const generatedAt = new Date()

    const run = (route: ResolvedRoute) => {
      const service = new LLMService(
        getLLMClient(route.provider, route.clientConfig)
      )
      return service.generateResumeAndCoverLetter({
        ...prepared.request,
        model: route.model
      })
    }

    let resume: string
    let coverLetter: string
    let selectedModel = prepared.primary.model
    try {
      ;({ resume, coverLetter } = await run(prepared.primary))
    } catch (err) {
      if (!prepared.fallback) throw err
      ;({ resume, coverLetter } = await run(prepared.fallback))
      selectedModel = prepared.fallback.model
    }

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

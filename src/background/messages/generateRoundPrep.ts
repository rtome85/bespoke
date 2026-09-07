import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient } from "~api/llm"
import { formatUserProfile } from "~api/llmService"
import { resolveJobRoute } from "~background/prepareGenerateRequest"
import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  DEFAULT_LLM_TUNING,
  type LLMTuningConfig,
  type PerplexityConfig
} from "~types/config"
import type { UserProfile } from "~types/userProfile"

interface Body {
  roundType: string
  companyName: string
  jobTitle: string
  jobDescription?: string
  userProfile?: UserProfile
}

const asStringList = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, max)
    : []

function parsePrep(content: string): {
  likelyTopics: string[]
  talkingPoints: string[]
} {
  const match = (content || "").match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const p = JSON.parse(match[0])
      const likelyTopics = asStringList(p.likelyTopics, 8)
      const talkingPoints = asStringList(p.talkingPoints, 8)
      if (likelyTopics.length || talkingPoints.length) {
        return { likelyTopics, talkingPoints }
      }
    } catch {
      /* fall through to the line-split fallback */
    }
  }
  const lines = (content || "")
    .split("\n")
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 3)
  return { likelyTopics: lines.slice(0, 6), talkingPoints: [] }
}

// Per-round "likely topics" + "talking points". One LLM call on the `drafting`
// route; the prompt is `perplexityConfig.interviewPrepPrompt` (falls back to
// the built-in default).
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req.body as Body

  try {
    const route = await resolveJobRoute("drafting")
    if ("error" in route) {
      res.send({ success: false, message: route.error })
      return
    }

    const { perplexityConfig, llmTuning } = (await chrome.storage.local.get([
      "perplexityConfig",
      "llmTuning"
    ])) as { perplexityConfig?: PerplexityConfig; llmTuning?: LLMTuningConfig }

    const template =
      perplexityConfig?.interviewPrepPrompt || DEFAULT_INTERVIEW_PREP_PROMPT
    const tuning = llmTuning ?? DEFAULT_LLM_TUNING

    const userPrompt = template
      .replace(/\{\{roundType\}\}/g, body.roundType || "interview")
      .replace(/\{\{companyName\}\}/g, body.companyName || "the company")
      .replace(/\{\{jobTitle\}\}/g, body.jobTitle || "the role")
      .replace(
        /\{\{jobDescription\}\}/g,
        body.jobDescription?.trim() || "(not provided)"
      )
      .replace(
        /\{\{userProfile\}\}/g,
        body.userProfile
          ? formatUserProfile(body.userProfile)
          : "(not provided)"
      )

    const client = getLLMClient(route.provider, route.clientConfig)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)

    let content: string
    try {
      content = await client.chat({
        model: route.model,
        messages: [
          {
            role: "system",
            content:
              "You are an interview preparation assistant. Return only valid JSON, no markdown."
          },
          { role: "user", content: userPrompt }
        ],
        temperature: Math.min(tuning.temperature, 0.5),
        topP: tuning.topP,
        maxTokens: 1400,
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
    }

    const { likelyTopics, talkingPoints } = parsePrep(content)
    if (!likelyTopics.length && !talkingPoints.length) {
      res.send({
        success: false,
        message: "The model didn't return anything usable. Try again."
      })
      return
    }

    res.send({
      success: true,
      likelyTopics,
      talkingPoints,
      thinInput: !body.jobDescription?.trim()
    })
  } catch (error) {
    res.send({
      success: false,
      message:
        error instanceof Error ? error.message : "Prep generation failed."
    })
  }
}

export default handler

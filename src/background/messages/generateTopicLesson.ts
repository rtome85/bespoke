import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient, type ChatMessage } from "~api/llm"
import { formatUserProfile } from "~api/llmService"
import {
  resolveJobRoute,
  type ResolvedRoute
} from "~background/prepareGenerateRequest"
import { lessonMathToText } from "~lib/interviews/lessonMath"
import {
  DEFAULT_LLM_TUNING,
  DEFAULT_TOPIC_LESSON_PROMPT,
  type LLMTuningConfig
} from "~types/config"
import type { UserProfile } from "~types/userProfile"

/** Which section of the technical sheet the lesson was opened from. */
export type LessonKind = "exercise" | "question"

interface Body {
  kind: LessonKind
  /** The exercise's title, or the drill question itself. */
  title: string
  /** The technology the item drills, where the sheet recorded one. */
  topic?: string
  /** The exercise task, or the answer stored against the question. */
  detail?: string
  /** Exercises only — "what a strong answer shows". */
  approach?: string
  roundType: string
  companyName: string
  jobTitle: string
  jobDescription?: string
  userProfile?: UserProfile
}

const NOT_PROVIDED = "(not provided)"

/**
 * Longest lesson worth storing. A round's prep already carries the sheet, and
 * `chrome.storage.local` holds every application — a runaway response that
 * repeats itself for 50k characters would be written to disk, synced to Drive
 * and re-read on every render of the applications list.
 */
const MAX_LESSON_CHARS = 20_000

/**
 * The model is asked for markdown, so there is no JSON to extract — but the
 * response is still untrusted text. Strip a wrapper fence if one came back
 * anyway (some models fence their whole answer despite being told not to),
 * leaving fences that belong to real code examples alone.
 *
 * LaTeX is translated here rather than at render time so it is never stored:
 * the prompt asks for Unicode, but models reach for `$\rightarrow$` anyway and
 * nothing downstream — the panel, the clipboard — can typeset it.
 */
export function parseLesson(content: string): string {
  const text = (content || "").trim()
  if (!text) return ""
  const wrapped = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*)\n```$/)
  return lessonMathToText(
    (wrapped ? wrapped[1].trim() : text).slice(0, MAX_LESSON_CHARS)
  )
}

/** The item as the prompt should see it: the task, plus what it is testing. */
function formatItem(body: Body): string {
  const parts: string[] = []
  if (body.detail?.trim()) {
    parts.push(
      body.kind === "exercise"
        ? `The task as set: ${body.detail.trim()}`
        : `The answer the sheet suggests: ${body.detail.trim()}`
    )
  }
  if (body.approach?.trim()) {
    parts.push(`What a strong answer shows: ${body.approach.trim()}`)
  }
  return parts.length ? parts.join("\n\n") : NOT_PROVIDED
}

/**
 * "Learn more" on one exercise or drill question from the technical prep
 * sheet: one LLM call on the `prep` route (retried on the configured fallback
 * route if the primary fails or times out), returning a markdown lesson.
 *
 * The prompt is a built-in — unlike the two prep prompts there is no storage
 * slot to override it, because its output has no structure the workspace
 * depends on. Anything the model writes renders.
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req.body as Body

  try {
    if (!body?.title?.trim()) {
      res.send({ success: false, message: "Nothing to expand on." })
      return
    }

    const route = await resolveJobRoute("prep")
    if ("error" in route) {
      res.send({ success: false, message: route.error })
      return
    }

    const { llmTuning } = (await chrome.storage.local.get(["llmTuning"])) as {
      llmTuning?: LLMTuningConfig
    }
    const tuning = llmTuning ?? DEFAULT_LLM_TUNING

    const userPrompt = DEFAULT_TOPIC_LESSON_PROMPT.replace(
      /\{\{roundType\}\}/g,
      body.roundType || "technical interview"
    )
      .replace(/\{\{companyName\}\}/g, body.companyName || "the company")
      .replace(/\{\{jobTitle\}\}/g, body.jobTitle || "the role")
      .replace(
        /\{\{jobDescription\}\}/g,
        body.jobDescription?.trim() || NOT_PROVIDED
      )
      .replace(
        /\{\{userProfile\}\}/g,
        // Years per skill, for the same reason the technical sheet asks for
        // them: the lesson is pitched against the gap between what the ad
        // demands and what the candidate already evidences.
        body.userProfile
          ? formatUserProfile(body.userProfile, true)
          : NOT_PROVIDED
      )
      .replace(
        /\{\{itemKind\}\}/g,
        body.kind === "exercise" ? "exercise" : "question"
      )
      .replace(/\{\{itemTopic\}\}/g, body.topic?.trim() || "unspecified")
      .replace(/\{\{itemTitle\}\}/g, body.title.trim())
      .replace(/\{\{itemBody\}\}/g, formatItem(body))

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a senior engineer teaching one topic to a candidate the evening before a technical interview. Every technical claim you make must be correct. Return markdown prose, never JSON."
      },
      { role: "user", content: userPrompt }
    ]

    // Fresh client + AbortController per attempt so a fallback retry after a
    // provider failure or the abort starts clean. A lesson is several times
    // longer than a prep sheet, so it gets longer than the 60s the sheet does.
    const run = async (r: ResolvedRoute): Promise<string> => {
      const client = getLLMClient(r.provider, r.clientConfig)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90_000)
      try {
        return await client.chat({
          model: r.model,
          messages,
          // Prose rather than structured JSON, so it isn't capped as hard as
          // the sheet — but a lesson that invents an API is worse than a dull
          // one, so it is still held below the tuning slider's top end.
          temperature: Math.min(tuning.temperature, 0.5),
          topP: tuning.topP,
          maxTokens: 4_000,
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeout)
      }
    }

    let content: string
    try {
      content = await run(route.primary)
    } catch (err) {
      if (!route.fallback) throw err
      content = await run(route.fallback)
    }

    const markdown = parseLesson(content)
    if (!markdown) {
      res.send({
        success: false,
        message: "The model didn't return a lesson. Try again."
      })
      return
    }

    res.send({
      success: true,
      markdown,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    res.send({
      success: false,
      message:
        error instanceof Error ? error.message : "Lesson generation failed."
    })
  }
}

export default handler

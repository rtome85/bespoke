import type { PlasmoMessaging } from "@plasmohq/messaging"

import { getLLMClient, type ChatMessage } from "~api/llm"
import { formatUserProfile } from "~api/llmService"
import {
  resolveJobRoute,
  type ResolvedRoute
} from "~background/prepareGenerateRequest"
import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  DEFAULT_LLM_TUNING,
  LEGACY_INTERVIEW_PREP_PROMPTS,
  type LLMTuningConfig,
  type PerplexityConfig
} from "~types/config"
import type { GapDefense, StarStory, UserProfile } from "~types/userProfile"

/** One earlier round of the same process, as the UI knows it. */
export interface PriorRoundContext {
  label: string
  date?: string
  rating?: number
  assessment?: string
  questionsAsked?: string
  outcome?: string
}

interface Body {
  roundType: string
  companyName: string
  jobTitle: string
  jobDescription?: string
  userProfile?: UserProfile
  /** Facts about the round itself — format, timing, who is in the room. */
  roundContext?: string
  /** Markdown from the research card, so topics can cite real company facts. */
  companyResearch?: string
  /** The match analysis already computed for this application. */
  matchPercentage?: number
  matchSummary?: string
  matchStrengths?: string[]
  matchWeaknesses?: string[]
  /** Debriefs of earlier rounds in this process. */
  priorRounds?: PriorRoundContext[]
  /** The user's own prep notes — they usually know something we don't. */
  userNotes?: string
}

const NOT_PROVIDED = "(not provided)"

/**
 * Strings only. A non-string entry is dropped rather than stringified:
 * `String({})` is "[object Object]", which is truthy and non-empty, so a model
 * answering with objects instead of strings would put that literal text on the
 * checklist, into storage, and into the copied sheet.
 */
const asStringList = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, max)
    : []

const asText = (v: unknown, max = 600): string =>
  typeof v === "string" ? v.trim().slice(0, max) : ""

function asGapDefenses(v: unknown, max: number): GapDefense[] {
  return (Array.isArray(v) ? v : [])
    .map((raw) => ({
      gap: asText(raw?.gap, 200),
      response: asText(raw?.response, 800)
    }))
    .filter((d) => d.gap && d.response)
    .slice(0, max)
}

function asStarStories(v: unknown, max: number): StarStory[] {
  return (
    (Array.isArray(v) ? v : [])
      .map((raw) => ({
        title: asText(raw?.title, 120),
        situation: asText(raw?.situation, 600),
        task: asText(raw?.task, 600),
        action: asText(raw?.action, 800),
        result: asText(raw?.result, 600),
        covers: asStringList(raw?.covers, 4)
      }))
      // A story with no action and no result is a label, not something to
      // rehearse — better to show fewer than to pad the section.
      .filter((s) => s.title && (s.action || s.result))
      .slice(0, max)
  )
}

export interface ParsedPrep {
  logistics: string
  likelyTopics: string[]
  talkingPoints: string[]
  questionsToAsk: string[]
  gapDefenses: GapDefense[]
  starStories: StarStory[]
}

const EMPTY_PREP: ParsedPrep = {
  logistics: "",
  likelyTopics: [],
  talkingPoints: [],
  questionsToAsk: [],
  gapDefenses: [],
  starStories: []
}

export function prepIsEmpty(p: ParsedPrep): boolean {
  return (
    !p.logistics &&
    !p.likelyTopics.length &&
    !p.talkingPoints.length &&
    !p.questionsToAsk.length &&
    !p.gapDefenses.length &&
    !p.starStories.length
  )
}

/**
 * Read the model's JSON. Unlike the previous version there is no line-split
 * fallback: dumping prose lines into `likelyTopics` produced something that
 * looked like real prep — preamble included — and gave the user no way to tell
 * a parse failure from a thin answer. An unreadable response is now reported
 * as one.
 */
export function parsePrep(content: string): ParsedPrep {
  const match = (content || "").match(/\{[\s\S]*\}/)
  if (!match) return EMPTY_PREP
  try {
    const p = JSON.parse(match[0])
    return {
      logistics: asText(p.logistics, 800),
      likelyTopics: asStringList(p.likelyTopics, 8),
      talkingPoints: asStringList(p.talkingPoints, 8),
      questionsToAsk: asStringList(p.questionsToAsk, 6),
      gapDefenses: asGapDefenses(p.gapDefenses, 5),
      starStories: asStarStories(p.starStories, 4)
    }
  } catch {
    return EMPTY_PREP
  }
}

/** The match analysis block, or a note that there isn't one. */
function formatMatchAnalysis(body: Body): string {
  const lines: string[] = []
  if (typeof body.matchPercentage === "number") {
    lines.push(`Match score: ${body.matchPercentage}%`)
  }
  if (body.matchSummary?.trim()) lines.push(body.matchSummary.trim())
  if (body.matchStrengths?.length) {
    lines.push(
      `Strengths:\n${body.matchStrengths.map((s) => `- ${s}`).join("\n")}`
    )
  }
  if (body.matchWeaknesses?.length) {
    lines.push(
      `Weaknesses / gaps:\n${body.matchWeaknesses.map((s) => `- ${s}`).join("\n")}`
    )
  }
  return lines.length ? lines.join("\n\n") : NOT_PROVIDED
}

/**
 * Earlier rounds, so prep for round 2 builds on round 1 instead of repeating
 * it. This is the context a generic "interview questions" prompt cannot have.
 */
function formatPriorRounds(rounds: PriorRoundContext[] | undefined): string {
  if (!rounds?.length) return "(this is the first round)"
  return rounds
    .map((r) => {
      const parts = [`${r.label}${r.date ? ` on ${r.date}` : ""}`]
      if (r.rating) parts.push(`the candidate rated it ${r.rating}/5`)
      if (r.outcome) parts.push(`outcome: ${r.outcome}`)
      const head = `- ${parts.join(" — ")}`
      const detail: string[] = []
      if (r.assessment?.trim())
        detail.push(`  How it went: ${r.assessment.trim()}`)
      if (r.questionsAsked?.trim()) {
        detail.push(`  Questions they asked: ${r.questionsAsked.trim()}`)
      }
      return [head, ...detail].join("\n")
    })
    .join("\n")
}

/**
 * Per-round interview prep. One LLM call on the `prep` route (retried on the
 * configured fallback route if the primary fails or times out); the prompt is
 * `perplexityConfig.interviewPrepPrompt`, falling back to the built-in default.
 *
 * A stored prompt that exactly matches a previously shipped default was never
 * edited by the user, so it is upgraded silently rather than stranding them on
 * a template that cannot produce the newer sections.
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req.body as Body

  try {
    const route = await resolveJobRoute("prep")
    if ("error" in route) {
      res.send({ success: false, message: route.error })
      return
    }

    const { perplexityConfig, llmTuning } = (await chrome.storage.local.get([
      "perplexityConfig",
      "llmTuning"
    ])) as { perplexityConfig?: PerplexityConfig; llmTuning?: LLMTuningConfig }

    const stored = perplexityConfig?.interviewPrepPrompt
    const customized =
      !!stored?.trim() && !LEGACY_INTERVIEW_PREP_PROMPTS.includes(stored)
    const template = customized ? stored! : DEFAULT_INTERVIEW_PREP_PROMPT
    const tuning = llmTuning ?? DEFAULT_LLM_TUNING

    const userPrompt = template
      .replace(/\{\{roundType\}\}/g, body.roundType || "interview")
      .replace(/\{\{companyName\}\}/g, body.companyName || "the company")
      .replace(/\{\{jobTitle\}\}/g, body.jobTitle || "the role")
      .replace(
        /\{\{jobDescription\}\}/g,
        body.jobDescription?.trim() || NOT_PROVIDED
      )
      .replace(
        /\{\{userProfile\}\}/g,
        body.userProfile ? formatUserProfile(body.userProfile) : NOT_PROVIDED
      )
      .replace(
        /\{\{roundContext\}\}/g,
        body.roundContext?.trim() || NOT_PROVIDED
      )
      .replace(
        /\{\{companyResearch\}\}/g,
        body.companyResearch?.trim() || NOT_PROVIDED
      )
      .replace(/\{\{matchAnalysis\}\}/g, formatMatchAnalysis(body))
      .replace(/\{\{priorRounds\}\}/g, formatPriorRounds(body.priorRounds))
      .replace(/\{\{userNotes\}\}/g, body.userNotes?.trim() || NOT_PROVIDED)

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are an interview preparation assistant. Return only valid JSON, no markdown."
      },
      { role: "user", content: userPrompt }
    ]

    // Fresh client + AbortController per attempt so a fallback retry after a
    // provider failure or the 60s abort starts clean.
    const run = async (r: ResolvedRoute): Promise<string> => {
      const client = getLLMClient(r.provider, r.clientConfig)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60_000)
      try {
        return await client.chat({
          model: r.model,
          messages,
          // Structured JSON: capped harder than free prose (see AGENTS.md).
          temperature: Math.min(tuning.temperature, 0.4),
          topP: tuning.topP,
          maxTokens: 3_000,
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

    const prep = parsePrep(content)
    if (prepIsEmpty(prep)) {
      res.send({
        success: false,
        message: customized
          ? "The model didn't return usable JSON. Check your custom prep prompt on the Prompts page, or reset it."
          : "The model didn't return anything usable. Try again."
      })
      return
    }

    // Thin inputs produce generic prep. Say which one was missing rather than
    // letting the user wonder why the result reads like a web article.
    const thin: string[] = []
    if (!body.jobDescription?.trim()) thin.push("a job description")
    if (!body.userProfile?.workExperience?.length) {
      thin.push("any work experience in your profile")
    }
    if (!body.companyResearch?.trim()) thin.push("company research")

    res.send({
      success: true,
      ...prep,
      // Kept for older callers that only read these two.
      thinInput: thin.length > 0,
      thinReasons: thin
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

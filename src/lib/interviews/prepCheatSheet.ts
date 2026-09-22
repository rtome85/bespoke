import { isTechnicalRound, roundLabel } from "~lib/interviews/selectors"
import type {
  InterviewRound,
  PrepItem,
  SavedApplication
} from "~types/userProfile"

/**
 * The whole prep sheet as markdown, for the Copy button.
 *
 * Prep is read minutes before an interview, usually on a second screen or a
 * phone — somewhere this extension isn't. One copyable block beats six
 * section-level ones, so this renders every populated section in reading order
 * and skips the empty ones entirely.
 */

const bullet = (item: PrepItem) =>
  `- [${item.checked ? "x" : " "}] ${item.pinned ? "★ " : ""}${item.text}`

const section = (title: string, body: string[]): string[] =>
  body.length ? [`## ${title}`, "", ...body, ""] : []

export function prepCheatSheet(
  app: SavedApplication,
  round: InterviewRound
): string {
  const prep = round.prep ?? {}
  const lines: string[] = [
    `# ${app.company} — ${roundLabel(round)}`,
    "",
    [round.date, round.time, app.jobTitle].filter(Boolean).join(" · "),
    ""
  ]

  if (prep.logistics?.trim()) {
    lines.push("## What to expect", "", prep.logistics.trim(), "")
  }

  const technical = isTechnicalRound(round)

  lines.push(
    ...section(
      technical ? "Stack to review" : "Likely topics",
      (prep.likelyTopics ?? []).map(bullet)
    ),
    ...section("My talking points", (prep.talkingPoints ?? []).map(bullet))
  )

  const exercises = prep.techExercises ?? []
  if (exercises.length) {
    lines.push("## Exercises to work through", "")
    for (const e of exercises) {
      lines.push(
        `### ${e.checked ? "[x] " : ""}${e.pinned ? "★ " : ""}${e.title}${
          e.topic ? ` — ${e.topic}` : ""
        }`,
        "",
        e.prompt,
        ...(e.approach
          ? ["", `**A strong answer shows** — ${e.approach}`]
          : []),
        ""
      )
    }
  }

  const drills = prep.techQuestions ?? []
  if (drills.length) {
    lines.push("## Question drill", "")
    for (const q of drills) {
      lines.push(
        `**${q.checked ? "[x] " : ""}${q.pinned ? "★ " : ""}${q.question}**${
          q.topic ? ` _(${q.topic})_` : ""
        }`,
        "",
        q.answer,
        ""
      )
    }
  }

  lines.push(
    ...section("Questions to ask them", (prep.questionsToAsk ?? []).map(bullet))
  )

  const gaps = prep.gapDefenses ?? []
  if (gaps.length) {
    lines.push("## If they press on…", "")
    for (const g of gaps) {
      lines.push(`**${g.gap}**`, "", g.response, "")
    }
  }

  const stories = prep.starStories ?? []
  if (stories.length) {
    lines.push("## Stories", "")
    for (const s of stories) {
      lines.push(
        `### ${s.title}`,
        "",
        ...(s.situation ? [`**Situation** — ${s.situation}`] : []),
        ...(s.task ? [`**Task** — ${s.task}`] : []),
        ...(s.action ? [`**Action** — ${s.action}`] : []),
        ...(s.result ? [`**Result** — ${s.result}`] : []),
        ""
      )
    }
  }

  if (prep.companyResearch?.trim()) {
    lines.push("## Company research", "", prep.companyResearch.trim(), "")
  }

  if (prep.notes?.trim()) {
    lines.push("## My notes", "", prep.notes.trim(), "")
  }

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

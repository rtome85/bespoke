import { roundsWithApp } from "~lib/interviews/selectors"
import {
  appliedDay,
  everInterviewed,
  everReplied,
  lastMoveDay
} from "~lib/overview/metrics"
import type { SavedApplication } from "~types/userProfile"

const COLUMNS = [
  "company",
  "job_title",
  "status",
  "applied_on",
  "last_moved_on",
  "match_percentage",
  "ever_applied",
  "ever_replied",
  "ever_interviewed",
  "rounds",
  "debriefs_logged",
  "avg_debrief_rating",
  "source",
  "job_url",
  "tags"
] as const

/** RFC 4180 quoting: wrap everything, double any embedded quote. */
function cell(value: unknown): string {
  const text =
    value === undefined || value === null
      ? ""
      : typeof value === "boolean"
        ? value
          ? "yes"
          : "no"
        : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function hostOf(url?: string): string {
  if (!url) return ""
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

/** The pipeline as a spreadsheet — one row per application. */
export function applicationsToCsv(apps: SavedApplication[]): string {
  const lines = [COLUMNS.map(cell).join(",")]

  for (const app of apps) {
    const rounds = app.rounds ?? []
    const ratings = rounds
      .map((r) => r.debrief?.rating)
      .filter((n): n is 1 | 2 | 3 | 4 | 5 => typeof n === "number")
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : ""

    lines.push(
      [
        app.company,
        app.jobTitle,
        app.status,
        appliedDay(app) ?? "",
        lastMoveDay(app) ?? "",
        app.matchPercentage ?? "",
        app.status !== "Saved",
        everReplied(app),
        everInterviewed(app),
        rounds.length,
        rounds.filter((r) => r.debrief?.loggedAt).length,
        avgRating,
        hostOf(app.jobUrl),
        app.jobUrl ?? "",
        (app.tags ?? []).join(" | ")
      ]
        .map(cell)
        .join(",")
    )
  }

  return lines.join("\r\n")
}

/** Rounds as their own sheet — one row per interview round. */
export function roundsToCsv(apps: SavedApplication[]): string {
  const header = [
    "company",
    "job_title",
    "round_type",
    "date",
    "time",
    "format",
    "prep_generated",
    "debrief_logged",
    "rating",
    "outcome",
    "open_follow_ups"
  ]
  const lines = [header.map(cell).join(",")]

  for (const { app, round } of roundsWithApp(apps)) {
    lines.push(
      [
        app.company,
        app.jobTitle,
        round.type === "Custom" ? round.customLabel ?? "Custom" : round.type,
        round.date ?? "",
        round.time ?? "",
        round.format ?? "",
        !!round.prep,
        !!round.debrief?.loggedAt,
        round.debrief?.rating ?? "",
        round.debrief?.outcome ?? "",
        (round.debrief?.followUps ?? []).filter((f) => !f.done).length
      ]
        .map(cell)
        .join(",")
    )
  }

  return lines.join("\r\n")
}

/** Hand the CSV to the browser as a download. */
export function downloadCsv(filename: string, csv: string): void {
  // The BOM keeps Excel from mangling accented company names.
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8"
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

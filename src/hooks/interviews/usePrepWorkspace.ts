import { useEffect, useMemo, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { requestHostPermission } from "~lib/hostPermissions"
import { researchIsStale } from "~lib/interviews/companyResearch"
import { companyOriginFrom } from "~lib/interviews/companySite"
import { prepCheatSheet } from "~lib/interviews/prepCheatSheet"
import {
  hasKeptWork,
  mergeGapDefenses,
  mergePrepItems,
  mergeStarStories
} from "~lib/interviews/prepMerge"
import {
  countdownLabel,
  minutesUntilRound,
  prepReady,
  priorRounds,
  roundContextLine,
  roundLabel
} from "~lib/interviews/selectors"
import { setRoundPrep } from "~storage/savedApplications"
import { RESEARCH_SOURCE_LABELS, type ResearchSource } from "~types/config"
import type {
  RoundPrep,
  SavedApplication,
  UserProfile
} from "~types/userProfile"

/**
 * Everything the prep workspace does that isn't composition.
 *
 * Two failures of the previous page are fixed here rather than in the markup,
 * so no future layout change can bring them back:
 *
 * 1. **Failures are per-section.** The old page kept one flat `string[]` of
 *    prefixed messages and gated the whole content branch on `prepReady()`. A
 *    run where research succeeded and topics failed therefore fetched the
 *    research, wrote it to storage, and then rendered "No prep generated yet"
 *    on top of it — with the retry link inside the card it had just declined
 *    to render. Errors are keyed by what failed, and `sheetHasContent` rather
 *    than `ready` decides whether there is anything worth showing.
 * 2. **The wait reports itself.** `generateCompanyResearch` aborts at 45s and
 *    `generateRoundPrep` at 60s, sequentially, behind a copy promise of "about
 *    30 seconds". `stage` says which of the two is running and `elapsed` counts
 *    up, so a slow run reads as slow instead of as broken.
 */

export type PrepStage = "idle" | "research" | "topics"

export interface PrepErrors {
  research?: string
  topics?: string
  copy?: string
}

export type PrepErrorKey = keyof PrepErrors

export interface SectionCount {
  done: number
  total: number
}

/** Ticked-vs-total across the five checkable sections. */
export interface Readiness extends SectionCount {
  topics: SectionCount
  points: SectionCount
  questions: SectionCount
  gaps: SectionCount
  stories: SectionCount
}

export interface Countdown {
  label: string
  minutes: number
  /** Close enough that the user is about to walk into the room. */
  urgent: boolean
  past: boolean
}

const URGENT_MINUTES = 120

const countChecked = (items?: { checked?: boolean }[]): SectionCount => ({
  done: (items ?? []).filter((i) => i.checked).length,
  total: (items ?? []).length
})

/**
 * `new URL()` on a value that crossed the message boundary from the service
 * worker, parsed during render, with no ErrorBoundary anywhere in the app — a
 * malformed origin would blank the whole workspace. Resolve it once,
 * defensively, and let the UI read `undefined` as "no row to show".
 */
const hostOf = (origin?: string): string | undefined => {
  if (!origin) return undefined
  try {
    return new URL(origin).host
  } catch {
    return undefined
  }
}

interface Options {
  apps: SavedApplication[]
  roundId: string
  onBack: () => void
}

export function usePrepWorkspace({ apps, roundId, onBack }: Options) {
  const found = useMemo(() => {
    for (const app of apps) {
      const round = (app.rounds ?? []).find((r) => r.id === roundId)
      if (round) return { app, round }
    }
    return undefined
  }, [apps, roundId])

  useEffect(() => {
    if (apps.length && !found) onBack()
  }, [apps.length, found, onBack])

  const [profile, setProfile] = useState<UserProfile | undefined>()
  useEffect(() => {
    chrome.storage.local.get("userProfile", (r) => setProfile(r.userProfile))
  }, [])

  const [stage, setStage] = useState<PrepStage>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [errors, setErrors] = useState<PrepErrors>({})
  const [hint, setHint] = useState("")
  const [copied, setCopied] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  /** Origin the user can grant to unlock reading the company's own site. */
  const [grantOrigin, setGrantOrigin] = useState("")
  /** Set while the destructive-regeneration dialog is open. */
  const [pendingRegen, setPendingRegen] = useState<{ research?: string }>()

  // Count up only while something is running. The old page showed a 14px
  // spinner for up to 105 seconds and said nothing else.
  useEffect(() => {
    if (stage === "idle") {
      setElapsed(0)
      return
    }
    const started = Date.now()
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1_000)),
      1_000
    )
    return () => clearInterval(id)
  }, [stage])

  // Re-render on a timer so the countdown stays honest without a reload. A
  // minute is the finest granularity it ever prints.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Debounced notes.
  const notesTimer = useRef<ReturnType<typeof setTimeout>>()
  const [notes, setNotes] = useState(() => found?.round.prep?.notes ?? "")

  // A pending debounce would otherwise be dropped when the user navigates
  // away mid-sentence — flush it instead of losing the last few seconds.
  const pendingNotes = useRef<{
    appId: string
    roundId: string
    text: string
  }>()
  const copyTimer = useRef<ReturnType<typeof setTimeout>>()
  const savedTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      if (!notesTimer.current) return
      clearTimeout(notesTimer.current)
      const p = pendingNotes.current
      if (p) void setRoundPrep(p.appId, p.roundId, { notes: p.text })
    },
    []
  )

  const app = found?.app
  const round = found?.round
  const prep: RoundPrep = round?.prep ?? {}

  const save = (patch: Partial<RoundPrep>) =>
    app && round ? setRoundPrep(app.id, round.id, patch) : Promise.resolve()

  const onNotesChange = (v: string) => {
    if (!app || !round) return
    setNotes(v)
    setNotesSaved(false)
    pendingNotes.current = { appId: app.id, roundId: round.id, text: v }
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      pendingNotes.current = undefined
      void save({ notes: v })
      // Notes previously saved in total silence. Saying so once, briefly, is
      // the difference between "it kept my note" and "I hope it kept my note"
      // for someone about to close the tab.
      setNotesSaved(true)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setNotesSaved(false), 2_000)
    }, 600)
  }

  const dismissError = (key: PrepErrorKey) =>
    setErrors((e) => ({ ...e, [key]: undefined }))

  /**
   * Copy, and say so only when the write actually resolved. The clipboard is
   * absent in some contexts and rejects in others (denied permission, an
   * unfocused document), and this button exists to get the sheet onto a second
   * screen minutes before an interview — "Copied" over an empty clipboard is
   * found out at the worst possible moment.
   */
  const copyText = async (text: string, what: string): Promise<boolean> => {
    dismissError("copy")
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("this browser didn't allow clipboard access")
      }
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      setErrors((e) => ({
        ...e,
        copy: `Couldn't copy ${what} — ${
          error instanceof Error ? error.message : "the clipboard refused"
        }.`
      }))
      return false
    }
  }

  const copySheet = async () => {
    if (!app || !round) return
    if (!(await copyText(prepCheatSheet(app, round), "the prep sheet"))) return
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2_000)
  }

  /**
   * Research and topics each report their own failure. They used to share one
   * error slot, and because topics cleared it on start, a research failure
   * during "Generate prep" vanished before the user could read it.
   */
  const genResearch = async (force = false): Promise<string | undefined> => {
    if (!app) return undefined
    setStage("research")
    dismissError("research")
    const r = await sendToBackground({
      name: "generateCompanyResearch",
      body: { company: app.company, jobUrl: app.jobUrl, force }
    })
    let text: string | undefined
    if (r?.success) {
      text = r.entry.text
      await save({
        companyResearch: r.entry.text,
        companyResearchAt: r.entry.generatedAt,
        companyResearchSource: r.entry.source
      })
    } else {
      setErrors((e) => ({
        ...e,
        research: r?.message ?? "Couldn't fetch company research."
      }))
    }
    setGrantOrigin(r?.needsHostPermission ?? "")
    setStage("idle")
    return text
  }

  const runTopics = async (research?: string) => {
    if (!app || !round) return
    setStage("topics")
    dismissError("topics")
    setHint("")
    const r = await sendToBackground({
      name: "generateRoundPrep",
      body: {
        roundType: roundLabel(round),
        companyName: app.company,
        jobTitle: app.jobTitle,
        jobDescription: app.jobDescription,
        userProfile: profile,
        roundContext: roundContextLine(round),
        // Freshly fetched research beats the copy on the round, which is a
        // render-time snapshot and may predate this run by seconds.
        companyResearch: research ?? prep.companyResearch,
        matchPercentage: app.matchPercentage,
        matchSummary: app.matchSummary,
        matchStrengths: app.matchStrengths,
        matchWeaknesses: app.matchWeaknesses,
        priorRounds: priorRounds(app, round.id).map((r) => ({
          label: roundLabel(r),
          date: r.date,
          rating: r.debrief?.rating,
          assessment: r.debrief?.assessment,
          questionsAsked: r.debrief?.questionsAsked,
          outcome: r.debrief?.outcome
        })),
        userNotes: notes
      }
    })
    if (r?.success) {
      await save({
        logistics: r.logistics || prep.logistics,
        likelyTopics: mergePrepItems(prep.likelyTopics, r.likelyTopics),
        talkingPoints: mergePrepItems(prep.talkingPoints, r.talkingPoints),
        questionsToAsk: mergePrepItems(prep.questionsToAsk, r.questionsToAsk),
        gapDefenses: mergeGapDefenses(prep.gapDefenses, r.gapDefenses),
        starStories: mergeStarStories(prep.starStories, r.starStories),
        topicsPointsAt: new Date().toISOString()
      })
      const reasons: string[] = r.thinReasons ?? []
      if (reasons.length) {
        setHint(
          `Generated without ${reasons.join(" or ")} — prep gets sharper once that's filled in.`
        )
      }
    } else {
      setErrors((e) => ({ ...e, topics: r?.message ?? "Generation failed." }))
    }
    setStage("idle")
  }

  /**
   * Gates on `hasKeptWork` exactly as before, but resolves through the app's
   * own focus-trapped `ConfirmDialog` rather than `window.confirm` — which was
   * the last native dialog of its kind in this feature.
   */
  const genTopics = async (regen = false, research?: string) => {
    if (
      regen &&
      hasKeptWork(
        prep.likelyTopics,
        prep.talkingPoints,
        prep.questionsToAsk,
        prep.gapDefenses,
        prep.starStories
      )
    ) {
      setPendingRegen({ research })
      return
    }
    await runTopics(research)
  }

  const confirmRegenerate = async () => {
    const pending = pendingRegen
    setPendingRegen(undefined)
    await runTopics(pending?.research)
  }

  /**
   * Research first, then topics with that research in hand — the topics call
   * cites the company's actual products only because it runs second.
   */
  const generateAll = async (force: boolean) => {
    const fresh = await genResearch(force)
    await genTopics(force, fresh ?? prep.companyResearch)
  }

  const allowSite = async () => {
    const origin = grantOrigin
    if (!origin) return
    const granted = await requestHostPermission(origin)
    if (!granted) return
    setGrantOrigin("")
    await genResearch(true)
  }

  const readiness: Readiness = useMemo(() => {
    const topics = countChecked(prep.likelyTopics)
    const points = countChecked(prep.talkingPoints)
    const questions = countChecked(prep.questionsToAsk)
    const gaps = countChecked(prep.gapDefenses)
    const stories = countChecked(prep.starStories)
    const all = [topics, points, questions, gaps, stories]
    return {
      done: all.reduce((n, s) => n + s.done, 0),
      total: all.reduce((n, s) => n + s.total, 0),
      topics,
      points,
      questions,
      gaps,
      stories
    }
  }, [
    prep.likelyTopics,
    prep.talkingPoints,
    prep.questionsToAsk,
    prep.gapDefenses,
    prep.starStories
  ])

  const countdown: Countdown | undefined = useMemo(() => {
    if (!round) return undefined
    const minutes = minutesUntilRound(round, now)
    if (minutes === null) return undefined
    return {
      label: countdownLabel(minutes),
      minutes,
      urgent: minutes >= 0 && minutes <= URGENT_MINUTES,
      past: minutes < 0
    }
  }, [round, now])

  const siteOrigin = app ? companyOriginFrom(app.jobUrl) : undefined
  const researchSource = prep.companyResearchSource as
    | ResearchSource
    | undefined

  return {
    found,
    app,
    round,
    prep,
    ready: round ? prepReady(round) : false,
    readiness,
    countdown,
    /** Is there anything worth putting on the clipboard or on the screen? */
    sheetHasContent:
      (round ? prepReady(round) : false) ||
      !!prep.companyResearch?.trim() ||
      !!prep.logistics?.trim() ||
      !!prep.notes?.trim(),
    researchStale: researchIsStale(prep.companyResearchAt),
    researchSource,
    researchSourceLabel: researchSource
      ? RESEARCH_SOURCE_LABELS[researchSource]
      : undefined,
    siteHost: hostOf(siteOrigin),
    grantHost: hostOf(grantOrigin),
    stage,
    elapsed,
    busy: stage !== "idle",
    researchBusy: stage === "research",
    topicsBusy: stage === "topics",
    errors,
    dismissError,
    hint,
    dismissHint: () => setHint(""),
    notes,
    notesSaved,
    onNotesChange,
    copied,
    copySheet,
    copyText,
    genResearch,
    genTopics,
    generateAll,
    allowSite,
    regenPending: !!pendingRegen,
    confirmRegenerate,
    cancelRegenerate: () => setPendingRegen(undefined),
    save
  }
}

export type PrepWorkspaceState = ReturnType<typeof usePrepWorkspace>

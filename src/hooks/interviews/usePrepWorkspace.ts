import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { requestHostPermission } from "~lib/hostPermissions"
import { researchIsStale } from "~lib/interviews/companyResearch"
import { companyOriginFrom } from "~lib/interviews/companySite"
import { prepCheatSheet } from "~lib/interviews/prepCheatSheet"
import {
  hasKeptWork,
  locateItem,
  mergeGapDefenses,
  mergePrepItems,
  mergeStarStories,
  mergeTechExercises,
  mergeTechQuestions
} from "~lib/interviews/prepMerge"
import {
  countdownLabel,
  isTechnicalRound,
  minutesUntilRound,
  prepReady,
  priorRounds,
  roundContextLine,
  roundLabel
} from "~lib/interviews/selectors"
import { setRoundPrep, type RoundPrepPatch } from "~storage/savedApplications"
import { RESEARCH_SOURCE_LABELS, type ResearchSource } from "~types/config"
import type {
  PrepLesson,
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

/**
 * Ticked-vs-total per section, plus the roll-up.
 *
 * Both run sheets are covered: `points` / `stories` are the behavioural pair,
 * `exercises` / `drills` the technical one. A round only ever generates one
 * pair, so the other reads 0/0 — and the roll-up sums all of them, because a
 * section is rendered whenever it has content (a round whose type changed
 * after a generation keeps showing, and counting, what it already had).
 */
export interface Readiness extends SectionCount {
  topics: SectionCount
  points: SectionCount
  questions: SectionCount
  gaps: SectionCount
  stories: SectionCount
  /** Technical rounds: exercises to work through. */
  exercises: SectionCount
  /** Technical rounds: the question-and-answer drill. */
  drills: SectionCount
}

export interface Countdown {
  label: string
  minutes: number
  /** Close enough that the user is about to walk into the room. */
  urgent: boolean
  past: boolean
}

/** Which of the two technical sections a lesson was opened from. */
export type LessonKind = "exercise" | "question"

/**
 * The "Learn more" panel, as the workspace needs to render it.
 *
 * Identified by section and index, but carrying the item's own text as well:
 * the write-back resolves the item by that text rather than by the index it
 * was opened at, so a regeneration that reorders the list while the lesson is
 * being written cannot attach it to a different exercise.
 */
export interface LessonView {
  kind: LessonKind
  index: number
  /** The exercise's title, or the drill question itself. */
  title: string
  topic?: string
  /** The item as it reads on the sheet — the task, or the stored answer. */
  detail?: string
  markdown?: string
  generatedAt?: string
  busy: boolean
  error?: string
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
  /** The open "Learn more" lesson, or nothing when the panel is closed. */
  const [lesson, setLesson] = useState<LessonView>()

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

  // `useSavedApplications` starts empty and fills asynchronously, so on a
  // direct load of a prep URL the initializer above runs while `found` is
  // still undefined and seeds "". Without this the field would then sit empty
  // over saved notes — and the first keystroke would debounce that empty value
  // straight over them.
  //
  // Keyed on the round id rather than on `found`, which is a fresh object
  // after every storage write: re-seeding on those would overwrite whatever
  // the user is in the middle of typing, including our own debounced save.
  const notesRoundId = useRef(found?.round.id)
  if (found && notesRoundId.current !== found.round.id) {
    notesRoundId.current = found.round.id
    setNotes(found.round.prep?.notes ?? "")
  }

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
  /**
   * A technical round is prepped as a study plan — stack review, exercises, a
   * Q&A drill — where every other round type gets the behavioural sheet built
   * on talking points and STAR stories. One flag drives both which prompt the
   * background handler runs and which sections the workspace writes back.
   */
  const technical = round ? isTechnicalRound(round) : false

  // A lesson takes up to 90 seconds to come back, and the sheet re-renders
  // several times in that window — from a tick, from a notes save, from a
  // regeneration. Opening the panel on an item has to read the prep as it
  // stands then, not the snapshot that was current when the workspace
  // mounted. (The write-back does not come through here: it derives its list
  // inside the mutation queue, which is the only place a read and a write are
  // atomic against each other.)
  //
  // Synced on commit rather than during render: a render React abandons never
  // happened, and assigning from inside one would leave the ref describing a
  // sheet nobody was ever shown. A layout effect rather than a passive one,
  // because a passive effect runs after paint and a click landing in that gap
  // would read the previous commit's prep.
  //
  // `prep` is `round?.prep ?? {}`, so the dependency changes identity on every
  // render of a round that has no prep yet. That is fine — the effect is one
  // assignment — and the fresh object is exactly what must not be memoized
  // away, since a stale `{}` here would silently drop a lesson's write-back.
  const prepRef = useRef(prep)
  useLayoutEffect(() => {
    prepRef.current = prep
  }, [prep])

  const save = (patch: RoundPrepPatch) =>
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
        userNotes: notes,
        technical
      }
    })
    if (r?.success) {
      // Only the sections this round type actually generates are patched. The
      // other sheet's sections are left out entirely rather than merged
      // against an empty response, so prep written before a round's type was
      // changed stays on the sheet instead of being quietly emptied.
      const patch: Partial<RoundPrep> = {
        logistics: r.logistics || prep.logistics,
        likelyTopics: mergePrepItems(prep.likelyTopics, r.likelyTopics),
        questionsToAsk: mergePrepItems(prep.questionsToAsk, r.questionsToAsk),
        topicsPointsAt: new Date().toISOString()
      }
      if (technical) {
        patch.techExercises = mergeTechExercises(
          prep.techExercises,
          r.techExercises
        )
        patch.techQuestions = mergeTechQuestions(
          prep.techQuestions,
          r.techQuestions
        )
      } else {
        patch.gapDefenses = mergeGapDefenses(prep.gapDefenses, r.gapDefenses)
        patch.talkingPoints = mergePrepItems(
          prep.talkingPoints,
          r.talkingPoints
        )
        patch.starStories = mergeStarStories(prep.starStories, r.starStories)
      }
      await save(patch)
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
   * The checkable sections a regeneration of THIS round would rewrite — the
   * same split `runTopics` patches. Listed once so the two cannot drift: a
   * warning about the other sheet's sections would be asking the user to
   * approve losing work that regenerating never touches, and the reverse
   * would let real work go without a word.
   */
  const regeneratedSections = technical
    ? [
        prep.likelyTopics,
        prep.questionsToAsk,
        prep.techExercises,
        prep.techQuestions
      ]
    : [
        prep.likelyTopics,
        prep.questionsToAsk,
        prep.talkingPoints,
        prep.gapDefenses,
        prep.starStories
      ]

  /**
   * Gates on `hasKeptWork`, resolved through the app's own focus-trapped
   * `ConfirmDialog` rather than `window.confirm` — which was the last native
   * dialog of its kind in this feature.
   */
  const genTopics = async (regen = false, research?: string) => {
    if (regen && hasKeptWork(...regeneratedSections)) {
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

  /**
   * The item a lesson is about, read from the live prep rather than from a
   * render-time snapshot.
   */
  const lessonItem = (kind: LessonKind, index: number) => {
    const cur = prepRef.current
    if (kind === "exercise") {
      const it = (cur.techExercises ?? [])[index]
      return it
        ? {
            title: it.title,
            topic: it.topic,
            detail: it.prompt,
            approach: it.approach,
            saved: it.lesson
          }
        : undefined
    }
    const it = (cur.techQuestions ?? [])[index]
    return it
      ? {
          title: it.question,
          topic: it.topic,
          detail: it.answer,
          approach: undefined,
          saved: it.lesson
        }
      : undefined
  }

  /**
   * Attach a finished lesson to the item it was opened from.
   *
   * Resolved by position first and text second. The slot the panel was opened
   * at is right in every case where nothing moved, and it is the only thing
   * that can tell two items apart when they read the same: nothing dedupes
   * the model's output, so a sheet can carry two exercises under one title,
   * and a bare text search would file both their lessons on whichever came
   * first. The text is what confirms the slot still holds the same item —
   * a regeneration can land during the 90 seconds a lesson takes, and writing
   * blind to an index on a reordered list would put a lesson on React hooks
   * under a Postgres exercise. When neither resolves, the write is dropped:
   * the panel still shows the lesson, it just isn't persisted onto an item
   * that no longer exists.
   *
   * The list is rebuilt from the prep as stored, inside the mutation queue,
   * rather than from anything this render is holding. Closing the panel does
   * not cancel the call behind it, so two lessons can be in flight at once:
   * built from a snapshot, the second to land would write back an array that
   * never had the first one's lesson in it, and a lesson the user paid for
   * would disappear. Serializing the write alone cannot fix that — the stale
   * array was already assembled by the time it reached the queue.
   */
  const saveLesson = (
    kind: LessonKind,
    index: number,
    title: string,
    value: PrepLesson
  ) =>
    save((cur) => {
      if (kind === "exercise") {
        const list = cur.techExercises ?? []
        const i = locateItem(list, index, (e) => e.title, title)
        return i < 0
          ? {}
          : {
              techExercises: list.map((e, idx) =>
                idx === i ? { ...e, lesson: value } : e
              )
            }
      }
      const list = cur.techQuestions ?? []
      const i = locateItem(list, index, (q) => q.question, title)
      return i < 0
        ? {}
        : {
            techQuestions: list.map((q, idx) =>
              idx === i ? { ...q, lesson: value } : q
            )
          }
    })

  /**
   * Open the lesson panel for one exercise or drill question, generating the
   * lesson unless one is already stored against the item.
   *
   * `force` is the panel's own Rewrite: the stored lesson is kept on screen
   * while the new one is written, so a failed rewrite leaves the user with
   * what they had rather than with an empty panel.
   */
  const runLesson = async (kind: LessonKind, index: number, force: boolean) => {
    const it = lessonItem(kind, index)
    if (!it || !app || !round) return

    const base: LessonView = {
      kind,
      index,
      title: it.title,
      topic: it.topic,
      detail: it.detail,
      markdown: it.saved?.markdown,
      generatedAt: it.saved?.generatedAt,
      busy: false
    }

    if (!force && it.saved?.markdown) {
      setLesson(base)
      return
    }
    setLesson({ ...base, busy: true, error: undefined })

    const r = await sendToBackground({
      name: "generateTopicLesson",
      body: {
        kind,
        title: it.title,
        topic: it.topic,
        detail: it.detail,
        approach: it.approach,
        roundType: roundLabel(round),
        companyName: app.company,
        jobTitle: app.jobTitle,
        jobDescription: app.jobDescription,
        userProfile: profile
      }
    })

    // The panel may have been closed, or moved to another item, during the
    // call. Land the result only if it is still the one on screen — but
    // persist it either way, since the user paid for it.
    const stillOpen = (l: LessonView | undefined) =>
      !!l && l.kind === kind && l.index === index && l.title === it.title

    if (r?.success) {
      const value: PrepLesson = {
        markdown: r.markdown,
        generatedAt: r.generatedAt
      }
      await saveLesson(kind, index, it.title, value)
      setLesson((l) =>
        stillOpen(l)
          ? { ...(l as LessonView), ...value, busy: false, error: undefined }
          : l
      )
      return
    }
    setLesson((l) =>
      stillOpen(l)
        ? {
            ...(l as LessonView),
            busy: false,
            error: r?.message ?? "Couldn't write the lesson."
          }
        : l
    )
  }

  const readiness: Readiness = useMemo(() => {
    const topics = countChecked(prep.likelyTopics)
    const points = countChecked(prep.talkingPoints)
    const questions = countChecked(prep.questionsToAsk)
    const gaps = countChecked(prep.gapDefenses)
    const stories = countChecked(prep.starStories)
    const exercises = countChecked(prep.techExercises)
    const drills = countChecked(prep.techQuestions)
    const all = [topics, points, questions, gaps, stories, exercises, drills]
    return {
      done: all.reduce((n, s) => n + s.done, 0),
      total: all.reduce((n, s) => n + s.total, 0),
      topics,
      points,
      questions,
      gaps,
      stories,
      exercises,
      drills
    }
  }, [
    prep.likelyTopics,
    prep.talkingPoints,
    prep.questionsToAsk,
    prep.gapDefenses,
    prep.starStories,
    prep.techExercises,
    prep.techQuestions
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
    technical,
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
    lesson,
    openLesson: (kind: LessonKind, index: number) =>
      runLesson(kind, index, false),
    rewriteLesson: () =>
      lesson ? runLesson(lesson.kind, lesson.index, true) : Promise.resolve(),
    closeLesson: () => setLesson(undefined),
    save
  }
}

export type PrepWorkspaceState = ReturnType<typeof usePrepWorkspace>

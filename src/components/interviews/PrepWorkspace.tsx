import { Check, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { BackLink } from "~components/common/BackLink"
import { Checklist } from "~components/interviews/Checklist"
import { GapDefenseList } from "~components/interviews/GapDefenseList"
import { RoundStrip } from "~components/interviews/RoundStrip"
import { StarStoryList } from "~components/interviews/StarStoryList"
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
  prepReady,
  priorRounds,
  relativeDayLabel,
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

interface Props {
  apps: SavedApplication[]
  roundId: string
  onBack: () => void
  onViewInSchedule: () => void
}

function SectionCard({
  title,
  subtitle,
  generatedAt,
  onCopy,
  onRegenerate,
  busy,
  children
}: {
  title: string
  subtitle?: ReactNode
  generatedAt?: string
  onCopy?: () => void
  onRegenerate?: () => void
  busy?: boolean
  children: ReactNode
}) {
  return (
    <div className="aa-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-aa-13 font-semibold text-aa-text-primary">
            {title}
          </h3>
          {generatedAt && (
            <p className="text-aa-11 text-aa-text-secondary mt-0.5">
              generated {relativeDayLabel(generatedAt.slice(0, 10))}
            </p>
          )}
          {subtitle}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onCopy && (
            <button type="button" onClick={onCopy} className="aa-btn-link">
              Copy
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={busy}
              className="aa-btn-link inline-flex items-center gap-1">
              {busy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Regenerate
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

export function PrepWorkspace({
  apps,
  roundId,
  onBack,
  onViewInSchedule
}: Props) {
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

  const [busy, setBusy] = useState<{ research?: boolean; topics?: boolean }>({})
  const [errors, setErrors] = useState<string[]>([])
  const [hint, setHint] = useState("")
  const [copied, setCopied] = useState(false)
  /** Origin the user can grant to unlock reading the company's own site. */
  const [grantOrigin, setGrantOrigin] = useState("")

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
  useEffect(
    () => () => {
      if (!notesTimer.current) return
      clearTimeout(notesTimer.current)
      const p = pendingNotes.current
      if (p) void setRoundPrep(p.appId, p.roundId, { notes: p.text })
    },
    []
  )

  if (!found) return null
  const { app, round } = found
  const prep: RoundPrep = round.prep ?? {}
  const ready = prepReady(round)
  const researchStale = researchIsStale(prep.companyResearchAt)
  const researchSource = prep.companyResearchSource as
    | ResearchSource
    | undefined

  const save = (patch: Partial<RoundPrep>) =>
    setRoundPrep(app.id, round.id, patch)

  const onNotesChange = (v: string) => {
    setNotes(v)
    pendingNotes.current = { appId: app.id, roundId: round.id, text: v }
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      pendingNotes.current = undefined
      void save({ notes: v })
    }, 600)
  }

  const copySheet = () => {
    void navigator.clipboard?.writeText(prepCheatSheet(app, round))
    setCopied(true)
    setTimeout(() => setCopied(false), 2_000)
  }

  /**
   * Research and topics each report their own failure. They used to share one
   * error slot, and because topics cleared it on start, a research failure
   * during "Generate prep" vanished before the user could read it.
   */
  const genResearch = async (force = false): Promise<string | undefined> => {
    setBusy((b) => ({ ...b, research: true }))
    setErrors((e) => e.filter((m) => !m.startsWith("Research:")))
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
      setErrors((e) => [
        ...e,
        `Research: ${r?.message ?? "couldn't fetch company research."}`
      ])
    }
    setGrantOrigin(r?.needsHostPermission ?? "")
    setBusy((b) => ({ ...b, research: false }))
    return text
  }

  const genTopics = async (regen = false, research?: string) => {
    if (
      regen &&
      hasKeptWork(
        prep.likelyTopics,
        prep.talkingPoints,
        prep.questionsToAsk,
        prep.gapDefenses,
        prep.starStories
      ) &&
      !window.confirm(
        "Regenerate replaces the AI-suggested items. Anything you ticked, pinned or added is kept. Continue?"
      )
    ) {
      return
    }
    setBusy((b) => ({ ...b, topics: true }))
    setErrors((e) => e.filter((m) => !m.startsWith("Prep:")))
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
      setErrors((e) => [...e, `Prep: ${r?.message ?? "generation failed."}`])
    }
    setBusy((b) => ({ ...b, topics: false }))
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

  const anyBusy = !!busy.research || !!busy.topics
  const siteOrigin = companyOriginFrom(app.jobUrl)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BackLink label="Prep" onClick={onBack} />
          <span className="text-aa-neutral-400">/</span>
          <span className="text-aa-sm font-semibold text-aa-text-primary truncate">
            {app.company} — {roundLabel(round)}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {ready && (
            <button
              type="button"
              onClick={copySheet}
              className="aa-btn-link inline-flex items-center gap-1">
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Copy sheet"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void generateAll(ready)}
            disabled={anyBusy}
            className="inline-flex items-center gap-2 px-4 py-aa-px-9 bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-aa-13 font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
            {anyBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {ready ? "Regenerate all" : "Generate prep"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <RoundStrip
          app={app}
          round={round}
          onViewInSchedule={onViewInSchedule}
          right={
            <span
              className={`inline-block px-2 py-0.5 rounded-aa-pill text-aa-10 font-bold uppercase tracking-wide ${
                ready
                  ? "bg-aa-success-soft text-aa-success-strong"
                  : "bg-aa-neutral-100 text-aa-text-secondary"
              }`}>
              {anyBusy ? "Generating…" : ready ? "Ready" : "Not started"}
            </span>
          }
        />

        <div
          role="status"
          aria-live="polite"
          className="space-y-1 empty:hidden">
          {errors.map((message) => (
            <p key={message} className="text-aa-caption text-aa-error-strong">
              {message}
            </p>
          ))}
          {hint && (
            <p className="text-aa-caption text-aa-warning-strong">{hint}</p>
          )}
        </div>

        {grantOrigin && (
          <div className="aa-message-info flex items-start justify-between gap-3">
            <span>
              Bespoke can read {new URL(grantOrigin).host} — the company's own
              site — to research them without a search account.
            </span>
            <button
              type="button"
              onClick={() => void allowSite()}
              className="shrink-0 font-semibold underline bg-transparent border-0 p-0 cursor-pointer text-aa-neutral-700">
              Allow
            </button>
          </div>
        )}

        {!ready ? (
          <div className="aa-card text-center py-12">
            <p className="text-aa-sm font-semibold text-aa-text-primary">
              No prep generated yet
            </p>
            <p className="text-aa-13 text-aa-text-secondary mt-1 max-w-md mx-auto">
              Company research, likely topics for a {roundLabel(round)},
              questions to ask them, answers for your weak spots, and stories
              from your own profile — about 30 seconds.
            </p>
            <button
              type="button"
              onClick={() => void generateAll(false)}
              disabled={anyBusy}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-aa-13 font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
              {anyBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Generate prep
            </button>
          </div>
        ) : (
          <>
            {prep.logistics && (
              <SectionCard
                title={`What to expect — ${roundLabel(round)}`}
                generatedAt={prep.topicsPointsAt}>
                <p className="text-aa-13 text-aa-neutral-700 leading-relaxed">
                  {prep.logistics}
                </p>
              </SectionCard>
            )}

            <SectionCard
              title="Company research"
              generatedAt={prep.companyResearchAt}
              subtitle={
                researchSource ? (
                  <p
                    className={`text-aa-11 mt-0.5 ${
                      researchSource === "model"
                        ? "text-aa-warning-strong"
                        : "text-aa-text-secondary"
                    }`}>
                    Source: {RESEARCH_SOURCE_LABELS[researchSource]}
                    {researchStale && " · over a month old"}
                  </p>
                ) : researchStale ? (
                  <p className="text-aa-11 text-aa-warning-strong mt-0.5">
                    Over a month old — worth refreshing.
                  </p>
                ) : undefined
              }
              onCopy={
                prep.companyResearch
                  ? () =>
                      void navigator.clipboard?.writeText(
                        prep.companyResearch ?? ""
                      )
                  : undefined
              }
              onRegenerate={() => void genResearch(true)}
              busy={busy.research}>
              {prep.companyResearch ? (
                <p className="text-aa-13 text-aa-neutral-700 leading-relaxed whitespace-pre-line">
                  {prep.companyResearch}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void genResearch(false)}
                  disabled={busy.research}
                  className="aa-btn-link">
                  Fetch company research
                </button>
              )}
              {!!prep.companyResearch && !!siteOrigin && (
                <p className="text-aa-11 text-aa-text-secondary mt-2">
                  Company site: {new URL(siteOrigin).host}
                </p>
              )}
            </SectionCard>

            <SectionCard
              title={`Likely topics — ${roundLabel(round)}`}
              generatedAt={prep.topicsPointsAt}
              onRegenerate={() => void genTopics(true)}
              busy={busy.topics}>
              <Checklist
                items={prep.likelyTopics ?? []}
                onChange={(next) => void save({ likelyTopics: next })}
                addLabel="Add a topic"
              />
            </SectionCard>

            <SectionCard
              title="Your talking points"
              generatedAt={prep.topicsPointsAt}
              onRegenerate={() => void genTopics(true)}
              busy={busy.topics}>
              <Checklist
                items={prep.talkingPoints ?? []}
                onChange={(next) => void save({ talkingPoints: next })}
                addLabel="Add a talking point"
              />
            </SectionCard>

            <SectionCard
              title="Questions to ask them"
              generatedAt={prep.topicsPointsAt}
              onRegenerate={() => void genTopics(true)}
              busy={busy.topics}>
              <Checklist
                items={prep.questionsToAsk ?? []}
                onChange={(next) => void save({ questionsToAsk: next })}
                addLabel="Add a question"
              />
            </SectionCard>

            <SectionCard
              title="If they press on…"
              generatedAt={prep.topicsPointsAt}
              onRegenerate={() => void genTopics(true)}
              busy={busy.topics}>
              <GapDefenseList
                items={prep.gapDefenses ?? []}
                onChange={(next) => void save({ gapDefenses: next })}
              />
            </SectionCard>

            <SectionCard
              title="Stories to have ready"
              generatedAt={prep.topicsPointsAt}
              onRegenerate={() => void genTopics(true)}
              busy={busy.topics}>
              <StarStoryList
                items={prep.starStories ?? []}
                onChange={(next) => void save({ starStories: next })}
              />
            </SectionCard>
          </>
        )}

        <div className="aa-card">
          <h3 className="text-aa-13 font-semibold text-aa-text-primary">
            My notes
          </h3>
          <p className="text-aa-11 text-aa-text-secondary mt-0.5 mb-2">
            Kept when you regenerate — and fed back in, so what you know here
            shapes the next run.
          </p>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
            placeholder="Questions to ask, things to double-check, reminders…"
            className="w-full px-3 py-2 bg-aa-surface border border-aa-border rounded-aa-md text-aa-13 text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors resize-y"
          />
        </div>
      </div>
    </div>
  )
}

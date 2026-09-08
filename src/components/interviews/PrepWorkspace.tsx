import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { BackLink } from "~components/BackLink"
import { Checklist } from "~components/interviews/Checklist"
import { RoundStrip } from "~components/interviews/RoundStrip"
import {
  prepReady,
  relativeDayLabel,
  roundLabel
} from "~lib/interviews/selectors"
import { setRoundPrep } from "~storage/savedApplications"
import type {
  PrepItem,
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

/** New AI items replace old AI items (carrying over checked/pinned by text);
 * user-added items are kept. */
function mergeItems(prev: PrepItem[] = [], nextTexts: string[]): PrepItem[] {
  const byText = new Map(
    prev
      .filter((p) => !p.userAdded)
      .map((p) => [p.text.trim().toLowerCase(), p])
  )
  const ai = nextTexts.map((t) => {
    const m = byText.get(t.trim().toLowerCase())
    return { text: t, checked: m?.checked, pinned: m?.pinned }
  })
  return [...ai, ...prev.filter((p) => p.userAdded)]
}

const card = "bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6"
const linkBtn =
  "text-[12px] font-semibold text-aa-primary hover:underline disabled:opacity-50 disabled:no-underline"

function SectionCard({
  title,
  generatedAt,
  onCopy,
  onRegenerate,
  busy,
  children
}: {
  title: string
  generatedAt?: string
  onCopy?: () => void
  onRegenerate?: () => void
  busy?: boolean
  children: ReactNode
}) {
  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-aa-text-primary">
            {title}
          </h3>
          {generatedAt && (
            <p className="text-[11px] text-aa-text-secondary mt-0.5">
              generated {relativeDayLabel(generatedAt.slice(0, 10))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onCopy && (
            <button type="button" onClick={onCopy} className={linkBtn}>
              Copy
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={busy}
              className={`${linkBtn} inline-flex items-center gap-1`}>
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
  const [error, setError] = useState("")
  const [hint, setHint] = useState("")

  // Debounced notes.
  const notesTimer = useRef<ReturnType<typeof setTimeout>>()
  const [notes, setNotes] = useState(() => found?.round.prep?.notes ?? "")

  if (!found) return null
  const { app, round } = found
  const prep: RoundPrep = round.prep ?? {}
  const ready = prepReady(round)

  const save = (patch: Partial<RoundPrep>) =>
    setRoundPrep(app.id, round.id, patch)

  const onNotesChange = (v: string) => {
    setNotes(v)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => void save({ notes: v }), 600)
  }

  const genResearch = async (force = false) => {
    setBusy((b) => ({ ...b, research: true }))
    setError("")
    const r = await sendToBackground({
      name: "generateCompanyResearch",
      body: { company: app.company, force }
    })
    if (r?.success) {
      await save({
        companyResearch: r.entry.text,
        companyResearchAt: r.entry.generatedAt
      })
    } else {
      setError(r?.message ?? "Couldn't fetch company research.")
    }
    setBusy((b) => ({ ...b, research: false }))
  }

  const genTopics = async (regen = false) => {
    if (
      regen &&
      (prep.likelyTopics?.some((i) => i.checked) ||
        prep.talkingPoints?.some((i) => i.checked)) &&
      !window.confirm(
        "Regenerate replaces the AI-suggested items. Your ticked items and anything you added stay. Continue?"
      )
    ) {
      return
    }
    setBusy((b) => ({ ...b, topics: true }))
    setError("")
    setHint("")
    const r = await sendToBackground({
      name: "generateRoundPrep",
      body: {
        roundType: roundLabel(round),
        companyName: app.company,
        jobTitle: app.jobTitle,
        jobDescription: app.jobDescription,
        userProfile: profile
      }
    })
    if (r?.success) {
      await save({
        likelyTopics: mergeItems(prep.likelyTopics, r.likelyTopics),
        talkingPoints: mergeItems(prep.talkingPoints, r.talkingPoints),
        topicsPointsAt: new Date().toISOString()
      })
      if (r.thinInput) {
        setHint(
          "Generated without a job description — add one to the application for sharper prep."
        )
      }
    } else {
      setError(r?.message ?? "Prep generation failed.")
    }
    setBusy((b) => ({ ...b, topics: false }))
  }

  const generateAll = async () => {
    await genResearch(false)
    await genTopics(false)
  }
  const regenerateAll = async () => {
    await genResearch(true)
    await genTopics(true)
  }

  const anyBusy = !!busy.research || !!busy.topics

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BackLink label="Prep" onClick={onBack} />
          <span className="text-aa-neutral-400">/</span>
          <span className="text-[14px] font-semibold text-aa-text-primary truncate">
            {app.company} — {roundLabel(round)}
          </span>
        </div>
        <button
          type="button"
          onClick={ready ? regenerateAll : generateAll}
          disabled={anyBusy}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
          {anyBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {ready ? "Regenerate all" : "Generate prep"}
        </button>
      </div>

      <div className="space-y-4">
        <RoundStrip
          app={app}
          round={round}
          onViewInSchedule={onViewInSchedule}
          right={
            <span
              className={`inline-block px-2 py-0.5 rounded-aa-pill text-[10px] font-bold uppercase tracking-wide ${
                ready
                  ? "bg-aa-success-soft text-aa-success-strong"
                  : "bg-aa-neutral-100 text-aa-text-secondary"
              }`}>
              {anyBusy ? "Generating…" : ready ? "Ready" : "Not started"}
            </span>
          }
        />

        {error && <p className="text-[12px] text-aa-error-strong">{error}</p>}
        {hint && <p className="text-[12px] text-aa-warning-strong">{hint}</p>}

        {!ready ? (
          <div className={`${card} text-center py-12`}>
            <p className="text-[14px] font-semibold text-aa-text-primary">
              No prep generated yet
            </p>
            <p className="text-[13px] text-aa-text-secondary mt-1 max-w-md mx-auto">
              Company research, likely topics for a {roundLabel(round)}, and
              talking points drawn from your profile — about 20 seconds.
            </p>
            <button
              type="button"
              onClick={generateAll}
              disabled={anyBusy}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer hover:bg-aa-primary-hover disabled:opacity-60 transition-colors">
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
            <SectionCard
              title="Company research"
              generatedAt={prep.companyResearchAt}
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
                <p className="text-[13px] text-aa-neutral-700 leading-relaxed whitespace-pre-line">
                  {prep.companyResearch}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void genResearch(false)}
                  disabled={busy.research}
                  className={linkBtn}>
                  Fetch company research
                </button>
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
          </>
        )}

        <div className={card}>
          <h3 className="text-[13px] font-semibold text-aa-text-primary">
            My notes
          </h3>
          <p className="text-[11px] text-aa-text-secondary mt-0.5 mb-2">
            Kept when you regenerate.
          </p>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
            placeholder="Questions to ask, things to double-check, reminders…"
            className="w-full px-3 py-2 bg-aa-surface border border-aa-border rounded-aa-md text-[13px] text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors resize-y"
          />
        </div>
      </div>
    </div>
  )
}

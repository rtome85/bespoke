import {
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Printer,
  Sparkles
} from "lucide-react"
import type { ReactNode } from "react"

import { BackLink } from "~components/common/BackLink"
import { Checklist } from "~components/interviews/Checklist"
import { GapDefenseList } from "~components/interviews/GapDefenseList"
import {
  CountdownChip,
  GenerateProgress,
  GrantSiteBanner,
  NotesPanel,
  PrepSkeleton,
  ReadinessMeter,
  RegenerateDialog,
  ResearchProvenance,
  SectionError,
  ThinHint
} from "~components/interviews/prep/PrepAtoms"
import {
  PrepSectionRail,
  type RailEntry
} from "~components/interviews/prep/PrepSectionRail"
import { StarStoryList } from "~components/interviews/StarStoryList"
import { usePrepWorkspace } from "~hooks/interviews/usePrepWorkspace"
import {
  formatLabel,
  relativeDayLabel,
  relativeTimeLabel,
  roundLabel
} from "~lib/interviews/selectors"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  roundId: string
  onBack: () => void
  onViewInSchedule: () => void
}

/**
 * The prep run sheet.
 *
 * Laid out as one continuous document rather than as six equal cards. The six
 * sections were never peers — they are a sequence, and five of them come out
 * of a single model call, which is why exactly one "Regenerate prep" sits on
 * the boundary that encloses those five instead of four identical buttons that
 * each quietly rewrote all of them.
 *
 * Company research and notes keep a surface of their own because they are the
 * only two things here with an independent lifecycle.
 */

const SECTION = {
  expect: "prep-expect",
  research: "prep-research",
  topics: "prep-topics",
  points: "prep-points",
  questions: "prep-questions",
  gaps: "prep-gaps",
  stories: "prep-stories",
  notes: "prep-notes"
}

/** A section of the sheet: a rule, a heading, and its content. */
function Section({
  id,
  title,
  meta,
  children
}: {
  id: string
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      className="aa-runsheet-section focus:outline-none">
      <div className="flex items-center justify-between gap-aa-3 mb-aa-3">
        <h2 className="aa-runsheet-title">{title}</h2>
        {meta}
      </div>
      {children}
    </section>
  )
}

/** One of the five sections that share a single generation. */
function Subsection({
  id,
  title,
  count,
  children
}: {
  id: string
  title: string
  count: { done: number; total: number }
  children: ReactNode
}) {
  const complete = count.total > 0 && count.done === count.total
  return (
    <section
      id={id}
      tabIndex={-1}
      className="aa-runsheet-sub focus:outline-none">
      <div className="flex items-center justify-between gap-aa-3">
        <h3 className="aa-runsheet-sub-title">{title}</h3>
        {count.total > 0 && (
          <span
            className={`text-aa-11 font-semibold tabular-nums ${
              complete ? "text-aa-success-strong" : "text-aa-text-secondary"
            }`}>
            {count.done} of {count.total} ready
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

export function PrepWorkspace({
  apps,
  roundId,
  onBack,
  onViewInSchedule
}: Props) {
  const w = usePrepWorkspace({ apps, roundId, onBack })

  if (!w.found || !w.app || !w.round) return null
  const { app, round, prep, readiness } = w
  const name = roundLabel(round)

  const facts = [
    round.date && `${round.date} (${relativeDayLabel(round.date)})`,
    round.time,
    formatLabel(round.format),
    round.interviewers?.split("\n")[0]
  ]
    .filter(Boolean)
    .join(" · ")

  const generatedLabel = prep.topicsPointsAt
    ? `generated ${relativeTimeLabel(prep.topicsPointsAt)}`
    : undefined

  const rail: RailEntry[] = [
    prep.logistics && { id: SECTION.expect, label: "What to expect" },
    { id: SECTION.research, label: "Company research" },
    w.ready && {
      id: SECTION.topics,
      label: "Likely topics",
      count: readiness.topics
    },
    w.ready && {
      id: SECTION.points,
      label: "Talking points",
      count: readiness.points
    },
    w.ready && {
      id: SECTION.questions,
      label: "Questions to ask",
      count: readiness.questions
    },
    w.ready && {
      id: SECTION.gaps,
      label: "If they press on…",
      count: readiness.gaps
    },
    w.ready && {
      id: SECTION.stories,
      label: "Stories",
      count: readiness.stories
    },
    { id: SECTION.notes, label: "My notes" }
  ].filter(Boolean) as RailEntry[]

  const notesPanel = (
    <NotesPanel
      id={SECTION.notes}
      value={w.notes}
      onChange={w.onNotesChange}
      saved={w.notesSaved}
    />
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-aa-4 mb-aa-5 aa-no-print">
        <BackLink label="Prep" onClick={onBack} />
        <div className="flex items-center gap-aa-2 shrink-0">
          {w.sheetHasContent && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="aa-btn-secondary inline-flex items-center gap-aa-2">
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                Print
              </button>
              <button
                type="button"
                onClick={() => void w.copySheet()}
                className="aa-btn-accent inline-flex items-center gap-aa-2">
                {w.copied ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {w.copied ? "Copied" : "Copy sheet"}
              </button>
            </>
          )}
        </div>
      </div>

      <header className="mb-aa-5 space-y-aa-3">
        <div className="flex items-start justify-between gap-aa-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="aa-prep-title">
              {app.company} — {name}
            </h1>
            <p className="text-aa-13 text-aa-text-secondary mt-aa-1">
              {facts || "Not scheduled yet"}
            </p>
            <button
              type="button"
              onClick={onViewInSchedule}
              className="aa-btn-link inline-flex items-center gap-aa-px-1 mt-aa-1 aa-no-print">
              View in Schedule
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          {w.countdown && <CountdownChip countdown={w.countdown} />}
        </div>

        {w.busy ? (
          <GenerateProgress
            stage={w.stage}
            elapsed={w.elapsed}
            company={app.company}
            roundName={name}
          />
        ) : (
          <ReadinessMeter
            done={readiness.done}
            total={readiness.total}
            generatedLabel={generatedLabel}
          />
        )}
      </header>

      <div className="space-y-aa-3 mb-aa-5 empty:hidden aa-no-print">
        {w.errors.copy && (
          <SectionError
            message={w.errors.copy}
            onDismiss={() => w.dismissError("copy")}
          />
        )}
        {w.hint && <ThinHint message={w.hint} onDismiss={w.dismissHint} />}
        {w.grantHost && (
          <GrantSiteBanner
            host={w.grantHost}
            onAllow={() => void w.allowSite()}
          />
        )}
      </div>

      {!w.sheetHasContent && !w.busy ? (
        <div className="space-y-aa-5">
          <div className="aa-runsheet-panel text-center">
            <p className="text-aa-sm font-semibold text-aa-text-primary">
              No prep generated yet
            </p>
            <p className="text-aa-13 text-aa-text-secondary max-w-md mx-auto">
              Company research, likely topics for a {name}, questions to ask
              them, answers for your weak spots, and stories from your own
              profile. Two model calls, usually under a minute.
            </p>
            {w.errors.topics && (
              <SectionError
                message={w.errors.topics}
                onRetry={() => void w.genTopics(false)}
                onDismiss={() => w.dismissError("topics")}
              />
            )}
            {w.errors.research && (
              <SectionError
                message={w.errors.research}
                onRetry={() => void w.genResearch(false)}
                onDismiss={() => w.dismissError("research")}
              />
            )}
            <button
              type="button"
              onClick={() => void w.generateAll(false)}
              className="aa-btn-accent inline-flex items-center gap-aa-2">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Generate prep
            </button>
          </div>
          {/* Notes feed the next generation, so before the first run they are
              the front door rather than the basement. */}
          {notesPanel}
        </div>
      ) : !w.sheetHasContent ? (
        <div className="aa-runsheet-panel">
          <PrepSkeleton />
        </div>
      ) : (
        <div className="aa-runsheet">
          <PrepSectionRail entries={rail} />

          <div className="space-y-aa-6 min-w-0">
            {prep.logistics && (
              <Section id={SECTION.expect} title={`What to expect — ${name}`}>
                <p className="text-aa-13 text-aa-neutral-700 leading-relaxed">
                  {prep.logistics}
                </p>
              </Section>
            )}

            <section
              id={SECTION.research}
              tabIndex={-1}
              className="aa-runsheet-panel focus:outline-none">
              <div className="flex items-start justify-between gap-aa-3">
                <div className="min-w-0">
                  <h2 className="aa-runsheet-title">Company research</h2>
                  <div className="mt-aa-1">
                    <ResearchProvenance
                      source={w.researchSource}
                      label={w.researchSourceLabel}
                      stale={w.researchStale}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-aa-3 shrink-0 aa-no-print">
                  {prep.companyResearch && (
                    <button
                      type="button"
                      onClick={() =>
                        void w.copyText(
                          prep.companyResearch ?? "",
                          "the company research"
                        )
                      }
                      className="aa-btn-link">
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void w.genResearch(true)}
                    disabled={w.busy}
                    className="aa-btn-link inline-flex items-center gap-aa-1">
                    {w.researchBusy && (
                      <Loader2
                        className="w-3 h-3 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    Refresh
                  </button>
                </div>
              </div>

              {w.errors.research && (
                <SectionError
                  message={w.errors.research}
                  onRetry={() => void w.genResearch(true)}
                  onDismiss={() => w.dismissError("research")}
                />
              )}

              {prep.companyResearch ? (
                <p className="text-aa-13 text-aa-neutral-700 leading-relaxed whitespace-pre-line">
                  {prep.companyResearch}
                </p>
              ) : (
                !w.errors.research && (
                  <button
                    type="button"
                    onClick={() => void w.genResearch(false)}
                    disabled={w.busy}
                    className="aa-btn-link">
                    Fetch company research
                  </button>
                )
              )}

              {!!prep.companyResearch && !!w.siteHost && (
                <p className="text-aa-11 text-aa-text-secondary">
                  Company site: {w.siteHost}
                </p>
              )}
            </section>

            {w.ready ? (
              <div className="aa-runsheet-group">
                <div className="aa-runsheet-group-head">
                  <div className="min-w-0">
                    <p className="text-aa-11 font-bold uppercase tracking-aa-wider-8 text-aa-text-secondary">
                      Written for this round
                    </p>
                    <p className="text-aa-11 text-aa-neutral-500 mt-aa-px-1">
                      These five sections are one generation — regenerating
                      rewrites them together.
                    </p>
                  </div>
                  <div className="flex items-center gap-aa-3 shrink-0 aa-no-print">
                    {w.topicsBusy ? (
                      <span className="aa-pill aa-pill-busy">Generating…</span>
                    ) : (
                      generatedLabel && (
                        <span className="text-aa-11 text-aa-text-secondary">
                          {generatedLabel}
                        </span>
                      )
                    )}
                    <button
                      type="button"
                      onClick={() => void w.genTopics(true)}
                      disabled={w.busy}
                      className="aa-btn-secondary inline-flex items-center gap-aa-2">
                      {w.topicsBusy && (
                        <Loader2
                          className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      )}
                      Regenerate prep
                    </button>
                  </div>
                </div>

                {w.errors.topics && (
                  <SectionError
                    message={w.errors.topics}
                    onRetry={() => void w.genTopics(false)}
                    onDismiss={() => w.dismissError("topics")}
                  />
                )}

                <Subsection
                  id={SECTION.topics}
                  title={`Likely topics — ${name}`}
                  count={readiness.topics}>
                  <Checklist
                    items={prep.likelyTopics ?? []}
                    onChange={(next) => void w.save({ likelyTopics: next })}
                    addLabel="Add a topic"
                  />
                </Subsection>

                <Subsection
                  id={SECTION.points}
                  title="Your talking points"
                  count={readiness.points}>
                  <Checklist
                    items={prep.talkingPoints ?? []}
                    onChange={(next) => void w.save({ talkingPoints: next })}
                    addLabel="Add a talking point"
                  />
                </Subsection>

                <Subsection
                  id={SECTION.questions}
                  title="Questions to ask them"
                  count={readiness.questions}>
                  <Checklist
                    items={prep.questionsToAsk ?? []}
                    onChange={(next) => void w.save({ questionsToAsk: next })}
                    addLabel="Add a question"
                  />
                </Subsection>

                <Subsection
                  id={SECTION.gaps}
                  title="If they press on…"
                  count={readiness.gaps}>
                  <GapDefenseList
                    items={prep.gapDefenses ?? []}
                    onChange={(next) => void w.save({ gapDefenses: next })}
                  />
                </Subsection>

                <Subsection
                  id={SECTION.stories}
                  title="Stories to have ready"
                  count={readiness.stories}>
                  <StarStoryList
                    items={prep.starStories ?? []}
                    onChange={(next) => void w.save({ starStories: next })}
                  />
                </Subsection>
              </div>
            ) : (
              /* Research (or a note) exists but the model sections don't. The
                 old page hid everything behind `prepReady()` here, including
                 the research it had just fetched and saved. */
              <div className="aa-runsheet-panel">
                <h2 className="aa-runsheet-title">Prep for this round</h2>
                <p className="text-aa-13 text-aa-text-secondary">
                  Topics, talking points, questions, gap answers and stories
                  haven't been generated yet.
                </p>
                {w.errors.topics && (
                  <SectionError
                    message={w.errors.topics}
                    onRetry={() => void w.genTopics(false)}
                    onDismiss={() => w.dismissError("topics")}
                  />
                )}
                <button
                  type="button"
                  onClick={() => void w.genTopics(false)}
                  disabled={w.busy}
                  className="aa-btn-accent inline-flex items-center gap-aa-2">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  Generate prep
                </button>
              </div>
            )}

            {notesPanel}
          </div>
        </div>
      )}

      <RegenerateDialog
        open={w.regenPending}
        onConfirm={() => void w.confirmRegenerate()}
        onCancel={w.cancelRegenerate}
      />
    </div>
  )
}

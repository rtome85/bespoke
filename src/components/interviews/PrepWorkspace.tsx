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
import { MarkdownPreview } from "~components/documentPreview/MarkdownPreview"
import { Checklist } from "~components/interviews/Checklist"
import { GapDefenseList } from "~components/interviews/GapDefenseList"
import { LessonPanel } from "~components/interviews/prep/LessonPanel"
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
import { TechExerciseList } from "~components/interviews/TechExerciseList"
import { TechQuestionList } from "~components/interviews/TechQuestionList"
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
 * Laid out as one continuous document rather than as equal cards. The
 * sections were never peers — they are a sequence, and most of them come out
 * of a single model call, which is why exactly one "Regenerate prep" sits on
 * the boundary that encloses them instead of identical buttons that each
 * quietly rewrote all of them.
 *
 * Company research and notes keep a surface of their own because they are the
 * only two things here with an independent lifecycle.
 *
 * A Technical round gets a different set of sections inside that boundary —
 * exercises and a question drill built on the job's stack, in place of the
 * talking points, STAR stories and gap defenses a behavioural round needs.
 * A missing technology there is something to revise rather than something to
 * have an answer ready for, so that section goes too. Sections that
 * belong to the other sheet still render when they hold content, so prep
 * written before a round's type was changed never vanishes.
 */

const SECTION = {
  expect: "prep-expect",
  research: "prep-research",
  topics: "prep-topics",
  exercises: "prep-exercises",
  drills: "prep-drills",
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

/** One of the sections that share a single generation. */
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

  // Each sheet owns a pair of sections; the other pair renders only when it
  // already holds something, which is how a round that was generated under a
  // different type keeps the work that came with it.
  const showExercises = w.technical || readiness.exercises.total > 0
  const showDrills = w.technical || readiness.drills.total > 0
  const showPoints = !w.technical || readiness.points.total > 0
  const showStories = !w.technical || readiness.stories.total > 0
  const showGaps = !w.technical || readiness.gaps.total > 0
  const topicsTitle = w.technical
    ? "Stack to review"
    : `Likely topics — ${name}`

  const rail: RailEntry[] = [
    prep.logistics && { id: SECTION.expect, label: "What to expect" },
    { id: SECTION.research, label: "Company research" },
    w.ready && {
      id: SECTION.topics,
      label: w.technical ? "Stack to review" : "Likely topics",
      count: readiness.topics
    },
    w.ready &&
      showExercises && {
        id: SECTION.exercises,
        label: "Exercises",
        count: readiness.exercises
      },
    w.ready &&
      showDrills && {
        id: SECTION.drills,
        label: "Question drill",
        count: readiness.drills
      },
    w.ready &&
      showPoints && {
        id: SECTION.points,
        label: "Talking points",
        count: readiness.points
      },
    w.ready && {
      id: SECTION.questions,
      label: "Questions to ask",
      count: readiness.questions
    },
    w.ready &&
      showGaps && {
        id: SECTION.gaps,
        label: "If they press on…",
        count: readiness.gaps
      },
    w.ready &&
      showStories && {
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

        {/* Grouped, because only one of the two is ever visible and the live
            region has to stay mounted even while idle. As a direct child of
            the `space-y` header it would pick up a margin while empty and
            open a gap under the title. */}
        <div>
          <GenerateProgress
            stage={w.stage}
            elapsed={w.elapsed}
            company={app.company}
            roundName={name}
          />
          {!w.busy && (
            <ReadinessMeter
              done={readiness.done}
              total={readiness.total}
              generatedLabel={generatedLabel}
            />
          )}
        </div>
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
              {w.technical
                ? "Company research, the stack this job runs on, exercises to work through, a drill of the questions they're likely to ask with answers, and technical questions to ask them. Two model calls, usually under a minute."
                : `Company research, likely topics for a ${name}, questions to ask them, answers for your weak spots, and stories from your own profile. Two model calls, usually under a minute.`}
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
                // Research comes back as markdown (companyInfoToMarkdown, or
                // the model's own prose), so it renders as markdown rather
                // than showing its `**bold**` raw. `whitespace-pre-line` keeps
                // the line breaks *inside* a paragraph — the Industry / Size
                // pair is two lines of one markdown paragraph, and the token
                // walker has no <br> to work from.
                <div className="text-aa-13 text-aa-neutral-700 leading-relaxed whitespace-pre-line">
                  <MarkdownPreview content={prep.companyResearch} />
                </div>
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
                      These sections are one generation — regenerating rewrites
                      them together.
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
                  title={topicsTitle}
                  count={readiness.topics}>
                  <Checklist
                    items={prep.likelyTopics ?? []}
                    onChange={(next) => void w.save({ likelyTopics: next })}
                    addLabel={w.technical ? "Add a technology" : "Add a topic"}
                  />
                </Subsection>

                {showExercises && (
                  <Subsection
                    id={SECTION.exercises}
                    title="Exercises to work through"
                    count={readiness.exercises}>
                    <TechExerciseList
                      items={prep.techExercises ?? []}
                      onChange={(next) => void w.save({ techExercises: next })}
                      onLearnMore={(i) => void w.openLesson("exercise", i)}
                    />
                  </Subsection>
                )}

                {showDrills && (
                  <Subsection
                    id={SECTION.drills}
                    title="Question drill"
                    count={readiness.drills}>
                    <TechQuestionList
                      items={prep.techQuestions ?? []}
                      onChange={(next) => void w.save({ techQuestions: next })}
                      onLearnMore={(i) => void w.openLesson("question", i)}
                    />
                  </Subsection>
                )}

                {showPoints && (
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
                )}

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

                {showGaps && (
                  <Subsection
                    id={SECTION.gaps}
                    title="If they press on…"
                    count={readiness.gaps}>
                    <GapDefenseList
                      items={prep.gapDefenses ?? []}
                      onChange={(next) => void w.save({ gapDefenses: next })}
                    />
                  </Subsection>
                )}

                {showStories && (
                  <Subsection
                    id={SECTION.stories}
                    title="Stories to have ready"
                    count={readiness.stories}>
                    <StarStoryList
                      items={prep.starStories ?? []}
                      onChange={(next) => void w.save({ starStories: next })}
                    />
                  </Subsection>
                )}
              </div>
            ) : (
              /* Research (or a note) exists but the model sections don't. The
                 old page hid everything behind `prepReady()` here, including
                 the research it had just fetched and saved. */
              <div className="aa-runsheet-panel">
                <h2 className="aa-runsheet-title">Prep for this round</h2>
                <p className="text-aa-13 text-aa-text-secondary">
                  {w.technical
                    ? "The stack to review, exercises, the question drill and questions to ask haven't been generated yet."
                    : "Topics, talking points, questions, gap answers and stories haven't been generated yet."}
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

      {w.lesson && (
        <LessonPanel
          lesson={w.lesson}
          onClose={w.closeLesson}
          onRewrite={() => void w.rewriteLesson()}
          onCopy={(text) => w.copyText(text, "the lesson")}
        />
      )}

      <RegenerateDialog
        open={w.regenPending}
        onConfirm={() => void w.confirmRegenerate()}
        onCancel={w.cancelRegenerate}
      />
    </div>
  )
}

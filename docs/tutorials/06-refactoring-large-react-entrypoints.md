# Refactoring a large React entrypoint, step by step

**Audience:** contributors working on a React and TypeScript entrypoint that has
grown large enough to mix rendering, state, effects, browser APIs, persistence,
and business workflows in one file.

**Goal:** reduce a large entrypoint to a small composition layer without
changing its behavior. This guide records the seven-step process used to reduce
`src/tabs/dialog.tsx` from more than 2,000 lines to roughly 200 lines.

The example is Bespoke's match dialog, but the sequence applies equally to a
large options page, dashboard, route, modal workflow, or React Native screen.

---

## Contents

1. [What success looks like](#1-what-success-looks-like)
2. [Before changing code](#2-before-changing-code)
3. [Step 1 — establish neutral foundations](#3-step-1--establish-neutral-foundations)
4. [Step 2 — extract leaf components](#4-step-2--extract-leaf-components)
5. [Step 3 — extract form screens](#5-step-3--extract-form-screens)
6. [Step 4 — extract the report screen](#6-step-4--extract-the-report-screen)
7. [Step 5 — extract lifecycle hooks](#7-step-5--extract-lifecycle-hooks)
8. [Step 6 — extract complete workflows](#8-step-6--extract-complete-workflows)
9. [Step 7 — extract the main controller hook](#9-step-7--extract-the-main-controller-hook)
10. [Runtime verification](#10-runtime-verification)
11. [Failure modes and design rules](#11-failure-modes-and-design-rules)
12. [Reusable checklist](#12-reusable-checklist)

---

## 1. What success looks like

A good entrypoint answers one question: **which screen should be rendered, and
which focused modules supply its data and callbacks?**

It should not contain hundreds of lines for parsing an API response, saving a
record, synchronizing storage, or rendering a detailed report. Those concerns
can change independently and deserve independent modules.

The final dependency direction should look like this:

```text
src/tabs/dialog.tsx
  ├── src/components/dialog/*
  ├── src/hooks/dialog/*
  ├── src/constants/dialog.ts
  └── src/types/dialog.ts

src/components/dialog/* ─┬──> src/constants/dialog.ts
                         └──> src/types/dialog.ts

src/hooks/dialog/* ──────┬──> src/constants/dialog.ts
                         ├──> src/types/dialog.ts
                         ├──> src/lib/dialog/*
                         └──> storage and messaging APIs
```

The important rule is that hooks and utilities do not import contracts from the
component layer. Components are consumers at the edge of the dependency graph,
not the home of shared domain contracts.

The result of this refactor was:

| Before                                                      | After                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| One 2,000+ line entrypoint                                  | A roughly 200-line composition entrypoint                                           |
| UI, parsing, effects, storage, and messaging mixed together | Components, hooks, types, constants, and pure utilities separated by responsibility |
| Hard to review a small behavior change                      | Changes can be reviewed within one focused module                                   |
| Runtime-only logic buried inside JSX                        | Pure parsing and presentation logic can be checked independently                    |

Line count is evidence of separation, not the objective. Moving 2,000 lines into
one 2,000-line hook would preserve the original design problem.

## 2. Before changing code

### 2.1 Record the repository's invariants

Read `AGENTS.md` before planning the split. For Bespoke, the important
constraints are:

- `src/tabs/dialog.tsx` is a Plasmo entrypoint and must retain its default
  component export.
- Application records must be updated through `mutateSavedApplications()`.
- Status transitions must continue to use `setApplicationStatus()`.
- Cross-directory imports use the `~` alias.
- New components use named exports.
- Both Chrome MV3 and Firefox MV2 builds must pass.
- Pre-existing large files must not be reformatted wholesale.

Write these down before extracting anything. A structurally attractive
refactor is still wrong if it bypasses storage serialization or breaks an
extension target.

### 2.2 Establish a baseline

Run the required checks before editing:

```bash
npx tsc --noEmit
pnpm build
pnpm build:firefox
```

Also record the starting size and identify the file's natural seams:

```bash
wc -l src/tabs/dialog.tsx
rg -n "^(async )?function |^  const handle|useEffect\(" src/tabs/dialog.tsx
```

Classify what you find:

| Category          | Examples                                               |
| ----------------- | ------------------------------------------------------ |
| Shared contracts  | Result types, form data, view unions                   |
| Constants         | Quotes, preset tags, shared field classes              |
| Pure logic        | Score presentation and response parsing                |
| Leaf UI           | Splash, card, row, button group                        |
| Screen UI         | Match form, save form, report                          |
| Lifecycle effects | Storage reads, listeners, progress timers              |
| Workflows         | Generate documents, save application, company research |
| Controller        | Job extraction and match-analysis state machine        |

### 2.3 Work in compilable slices

Each of the seven steps below is a boundary. After every step, type-check and
build before continuing. If a step breaks something, the search area stays
small.

Do not commit automatically in this repository. Stop at green builds and wait
for an explicit commit request, as required by `AGENTS.md`.

## 3. Step 1 — establish neutral foundations

### Objective

Give later components and hooks stable modules to import from before moving UI
or behavior.

### Extract

Create these neutral modules:

```text
src/types/dialog.ts
src/constants/dialog.ts
src/lib/dialog/navigation.ts
src/lib/dialog/scorePresentation.ts
```

`src/types/dialog.ts` should contain contracts shared across layers, such as:

- `GenerationResult`
- `GeneratedDocuments`
- `SaveApplicationFormData`
- `PendingJobData`
- `DialogView`
- `MatchAccordionSection`
- `TriageDecision`
- `RoutingLabels`
- `AddedGapSkills`

`src/constants/dialog.ts` should contain immutable UI configuration shared by
more than one component or hook:

- Progress-screen quotes
- Preset application tags
- Shared form-label and input class strings

Pure functions belong under `src/lib/dialog`, not in components or hooks. In
this refactor, navigation helpers and score-presentation helpers moved there.

### Dependency rule

Do not put shared types or constants in `src/components/dialog`. That creates an
upward dependency where hooks import from the UI layer:

```ts
// Avoid
import type { GenerationResult } from "~components/dialog/types"

// Prefer
import type { GenerationResult } from "~types/dialog"
```

The session initially used the component directory and corrected it later. A
future refactor should use the neutral locations from step 1 and avoid that
detour.

### Verify

```bash
npx prettier --check src/types/dialog.ts src/constants/dialog.ts src/lib/dialog
npx tsc --noEmit
pnpm build
pnpm build:firefox
```

## 4. Step 2 — extract leaf components

### Objective

Remove visually self-contained JSX with small, explicit prop contracts. Leaf
components are low-risk and reveal the prop vocabulary needed by larger
screens.

### Extract

The first leaf components were:

```text
src/components/dialog/AnalysisSplash.tsx
src/components/dialog/CompanyResearchCard.tsx
src/components/dialog/GapRow.tsx
```

Good leaf candidates have most of these properties:

- They render one card, row, or state.
- Their behavior is fully described by props.
- They do not own storage or background messages.
- They have few dependencies on parent-local variables.
- They can be visually understood without reading the entrypoint.

Use named exports and explicit props:

```tsx
interface Props {
  progress: number
  quote: { text: string; author: string }
  quoteVisible: boolean
}

export function AnalysisSplash({ progress, quote, quoteVisible }: Props) {
  // Presentational JSX only
}
```

Avoid passing a single object containing the entire parent state. That hides
dependencies and makes the child as coupled as the original inline JSX.

### Verify

After replacing each inline block, type-check immediately. For a component with
non-trivial initial rendering, a temporary `react-dom/server` smoke check can
exercise initializers and render paths. Effects require real browser
verification later.

## 5. Step 3 — extract form screens

### Objective

Turn each form view into a screen component while keeping workflow ownership in
the entrypoint for now.

### Extract

```text
src/components/dialog/MatchFormScreen.tsx
src/components/dialog/SaveApplicationScreen.tsx
src/components/dialog/ApplicationDetailsFields.tsx
src/components/dialog/ApplicationTagsField.tsx
```

Split a screen again when a subsection has its own focused state contract. The
save screen delegates ordinary fields and tag selection rather than embedding
all form markup in one file.

At this stage, screen components should receive:

- Current values
- Change callbacks or a typed state setter
- Submit/close callbacks
- Loading and error state

They should not call `chrome.storage.local`, `sendToBackground()`, or
`mutateSavedApplications()` directly. Keeping side effects outside the screen
makes the later hook extraction mechanical.

### Preserve form behavior

Check these details during extraction:

- `preventDefault()` still happens exactly once.
- Required-field validation messages are unchanged.
- Controlled inputs receive both their value and change callback.
- Close and back actions return to the same view.
- Application tags preserve their order and existing custom values.

## 6. Step 4 — extract the report screen

### Objective

Remove the largest JSX branch after the forms and divide it by user-facing
responsibility.

### Extract

```text
src/components/dialog/MatchReportScreen.tsx
src/components/dialog/ScoreSummaryCard.tsx
src/components/dialog/MatchBreakdown.tsx
src/components/dialog/TriageActions.tsx
src/components/dialog/StrengthenApplication.tsx
src/components/dialog/DocumentGenerationControls.tsx
src/components/dialog/GeneratedDocumentsCard.tsx
```

The report screen is a composition layer for report-specific UI. It can own the
layout, but business effects remain callbacks:

```tsx
<MatchReportScreen
  result={result}
  onApply={() => setTriageDecision("apply")}
  onGenerateDocuments={generateDocuments}
  onPreviewDocuments={openDocumentPreview}
/>
```

Move derived presentation rules, such as score colors or labels, into pure
utilities. Do not place them in a hook merely because they originated inside a
React component.

### Watch for prop duplication

Large JSX moves make duplicated props and callbacks easy to miss. Search the
new call site and type-check after the move:

```bash
rg -n "<MatchReportScreen|triageDecision=" src/tabs/dialog.tsx
npx tsc --noEmit
```

## 7. Step 5 — extract lifecycle hooks

### Objective

Move recurring React lifecycle mechanics out of the entrypoint before moving
complete business workflows.

### Extract

All hooks live under their own feature folder:

```text
src/hooks/dialog/useDialogStoredState.ts
src/hooks/dialog/usePendingJobData.ts
src/hooks/dialog/useDocumentPreviewSync.ts
src/hooks/dialog/useSimulatedProgress.ts
```

Their responsibilities are deliberately narrow:

| Hook                     | Responsibility                                    |
| ------------------------ | ------------------------------------------------- |
| `useDialogStoredState`   | Initial storage read and routing-label derivation |
| `usePendingJobData`      | Filtered `chrome.storage.onChanged` subscription  |
| `useDocumentPreviewSync` | Merge edits returned by the preview bridge        |
| `useSimulatedProgress`   | Progress and rotating-quote timers                |

### Listener rule

Storage hooks must retain the repository's listener discipline:

```ts
if (area !== "local" || !(key in changes)) return
```

Always remove the listener in effect cleanup. When a listener invokes a callback
from props, keep a ref to the latest callback so the extension listener does not
close over stale state.

### Timer rule

Store interval handles in refs and clear them both when work stops and when the
component unmounts. Progress must have a ceiling below 100 while work is still
pending; only the successful result should set it to 100.

## 8. Step 6 — extract complete workflows

### Objective

Move each independent asynchronous workflow, including its state, errors, and
side effects, into one focused hook.

### Extract

```text
src/hooks/dialog/useCompanyResearch.ts
src/hooks/dialog/useDocumentGeneration.ts
src/hooks/dialog/useApplicationForm.ts
src/lib/dialog/companyResearchParser.ts
```

#### Company research

`useCompanyResearch` owns the network lifecycle and exposes only the resulting
company information and loading state. Its untrusted JSON parsing lives in the
pure `companyResearchParser.ts` module.

The request must use an `AbortController`, pass its signal to `fetch`, abort
after a bounded timeout, and ignore results after cleanup. Parsing must accept
markdown fences, tolerate field-name variations, clean citation markers, and
validate ratings.

#### Document generation

`useDocumentGeneration` owns:

- Current-result document generation
- Saved-application document generation
- Generated-document progress and errors
- The storage bridge used to open document preview

It continues to call background message handlers rather than implementing LLM
requests in the UI.

#### Application form

`useApplicationForm` owns form initialization, validation, save options, and
persistence. It must preserve the storage invariants:

```ts
mutateSavedApplications((current) => /* derive the next list */)
```

Never replace this with a write from a React snapshot. If an edited status
changes, continue through `setApplicationStatus()` so interview-round side
effects remain centralized.

### Avoid a disguised monolith

A workflow hook should have one reason to change. Company research, document
generation, and application persistence stayed separate even though combining
them into `useDialog()` would have produced fewer imports.

## 9. Step 7 — extract the main controller hook

### Objective

Move the remaining state machine out of the entrypoint after its neighboring
workflows have stable interfaces.

### Extract

```text
src/hooks/dialog/useMatchAnalysis.ts
```

This hook owns the state that moves together during the match flow:

- Company, job title, and job description
- Initial and live job-extraction data
- Automatic analysis after successful extraction
- Match request loading, status, progress, and result
- Triage selection and added gap skills
- Document-preview result synchronization

The extraction is safe at this point because components and neighboring hooks
already define the controller's boundaries.

### Preserve stale-request protection

An extraction can supersede an in-flight analysis. Keep a monotonically
increasing request identifier:

```ts
const analysisRequestIdRef = useRef(0)

const requestId = ++analysisRequestIdRef.current
const response = await sendToBackground(/* ... */)

if (analysisRequestIdRef.current !== requestId) return
```

Check the identifier both after the background response and inside any delayed
success transition. Otherwise an older request can overwrite a newer job.

### Final entrypoint responsibility

After step 7, `src/tabs/dialog.tsx` should contain only:

- Initial route/view selection
- Calls to focused hooks
- Small UI-only state such as accordion expansion
- Conditional rendering of extracting, loading, report, save, and form screens
- Wiring returned callbacks into screen props

If a new feature adds 100 lines to the entrypoint, decide whether it belongs to
a screen, workflow hook, or pure utility before merging it.

## 10. Runtime verification

Type-checking and builds prove that modules resolve and both manifests bundle.
They do not run effects or real extension APIs. The refactor is not fully
verified until the unpacked extension exercises these flows.

Start the development build:

```bash
pnpm dev
```

Load `build/chrome-mv3-dev` at `chrome://extensions`, then verify:

1. Open the match dialog manually and submit company, title, and description.
2. Trigger extraction from a real job posting and confirm analysis starts
   automatically when company and title are available.
3. Trigger a second extraction while analysis is pending and confirm the old
   result does not replace the new one.
4. Expand each match section and add a gap skill; reopen settings and confirm the
   skill persisted.
5. Run company research with valid Perplexity configuration.
6. Generate documents and open both preview tabs.
7. Save for later without documents.
8. Generate documents for an already-saved application.
9. Edit an application's status and confirm centralized interview status
   side-effects still occur.
10. Close and reopen the panel to confirm storage-backed state remains valid.

Record any flow involving live messages, windows, storage events, or side-panel
behavior as **needs load-unpacked verification** until it has been checked this
way.

## 11. Failure modes and design rules

### Moving lines without improving boundaries

Do not replace a large component with a similarly large `useDialogController`
on the first step. Extract from the outside inward: contracts, leaves, screens,
lifecycle mechanics, workflows, then controller.

### Hooks importing components

This reverses the intended dependency direction. Shared contracts belong in
`src/types`; shared constants belong in `src/constants`; pure transformations
belong in `src/lib`.

### Reformatting the original file

The tracked tree is not uniformly Prettier-clean. Format only newly created
files. For the original entrypoint, hand-place imports and inspect the diff:

```bash
git diff --check
git diff -- src/tabs/dialog.tsx
```

### Losing extension cleanup

Every `chrome.storage.onChanged` listener, timeout, interval, and abortable
network request needs cleanup. React development behavior and panel closure can
otherwise leave duplicated callbacks or stale updates.

### Bypassing domain helpers during a move

Refactoring is not permission to simplify away concurrency or side-effect
rules. Continue using the saved-application mutation queue and centralized
status helpers.

### Mistaking builds for runtime verification

Plasmo builds cannot prove that `chrome.sidePanel`, message handlers, storage
events, or preview windows work. State that limitation explicitly at handoff.

### Mixing unrelated cleanup into the refactor

Do not modernize nearby code, rename unrelated concepts, or format other large
files. A structural refactor is easiest to trust when behavior changes are
absent or called out individually.

## 12. Reusable checklist

Copy this checklist into the next large-entrypoint refactor:

```text
[ ] Read AGENTS.md and record invariants
[ ] Run tsc, Chrome build, and Firefox build before editing
[ ] Inventory types, constants, pure logic, UI, effects, and workflows
[ ] Step 1: move neutral types/constants/helpers
[ ] Step 2: extract leaf components
[ ] Step 3: extract form screens
[ ] Step 4: extract the largest report/detail screen
[ ] Step 5: extract narrow lifecycle hooks into src/hooks/<feature>
[ ] Step 6: extract independent async workflows
[ ] Step 7: extract the remaining controller/state machine
[ ] Confirm hooks and lib modules do not import from components
[ ] Format only new files; run git diff --check
[ ] Run npx tsc --noEmit
[ ] Run pnpm build
[ ] Run pnpm build:firefox
[ ] Run pure-logic smoke checks where builds do not exercise behavior
[ ] Perform or explicitly request load-unpacked verification
[ ] Review the final diff for behavior changes
[ ] Wait for explicit commit/PR instructions
```

The sequence matters. Each step reduces the number of variables involved in the
next one, so the final controller extraction becomes a straightforward move
rather than a redesign.

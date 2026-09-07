# Interviews — multi-phase implementation plan

Turns the canvas designs (Interviews rail group + **Schedule / Prep / Debriefs**, the
Add round drawer, and the full-page Prep and Debrief workspaces) into shippable
phases, and collapses the application-status model at the same time.

## Locked decisions (from design QA)

| # | Decision |
|---|---|
| 1 | **Placement** — Interviews is a **rail group inside the Applications section**. AppBar stays `Applications \| Settings`. |
| 2 | **Storage** — rounds are **embedded**: `SavedApplication.rounds: InterviewRound[]`. Cross-app views (agenda, "needs debrief") are derived selectors. Rides the existing `mutateSavedApplications` writer + export/Drive sync for free. |
| 3 | **Status model** — collapse `ApplicationStatus` to `Saved \| Applied \| Interviewing \| Offer \| Reject`. Stage detail (HR / Technical / Final / custom) lives on `round.type`. |
| 4 | **Routing** — hash routes (`#/interviews/prep/:roundId`, …). Back/forward works; popup deep-links; full-page workspaces get real URLs. |
| 5 | **Migration** — map the 4 interview statuses → `Interviewing` **and** synthesize one past `InterviewRound` per affected app (type inferred, `date = statusUpdatedAt`, `synthesized: true`). The existing `preparationPlan` text moves onto that round's `prep`. |
| 6 | **Debrief "Advance" outcome** — status stays `Interviewing`; after save, a toast "Round logged. Schedule the next one?" opens the **Add round drawer pre-filled** with that application. |
| 7 | **Prep engine** — `companyResearch` from the existing **Perplexity** pipeline, cached per company and reused across that company's rounds. `likelyTopics` + `talkingPoints` from **one round-type-aware LLM call** (inputs: `round.type`, `jobDescription`, `userProfile`, `companyName`). Per-section regenerate. |
| 8 | **Old prep feature** — **replace**: remove `PreparationPlanModal` and all `preparationPlan` reads/UI (incl. in `dialog.tsx`); **keep** the editable prompt(s) in Settings, repurposed to feed the new engine. |
| 9 | **Milestone scope** — IN: rail restructure, status collapse + migration, Schedule / Prep / Debriefs, Add round drawer, prep + debrief engines, **removal of Needs attention + Favorites**. BASELINE (already in `main`): the Applications list + Overview app-shell (`920b722`). |
| 10 | **Reminders** — real `chrome.alarms` + `chrome.notifications` for upcoming rounds (24 h and 1 h before), scheduled/cancelled as rounds are added / rescheduled / deleted. Default on; single Settings toggle. |
| 11 | **Schedule row click** — opens `AddRoundDrawer` in **edit mode** (reschedule / change format / interviewers / delete). |
| 12 | **Interviewers** — freeform `string`, newline per person. |
| 13 | **Research cache** — `companyResearchCache` in `chrome.storage.local`; **the side-panel match flow seeds it** so Prep usually never re-fetches. |
| 14 | **Prep model route** — the topics/talking-points LLM call reuses the existing **`drafting`** route. No new `ModelRouting` entry, no new Settings row. |
| 15 | **`isFavorite`** — delete the field and every reference now (not deprecated). |

## Tech context (unchanged)

Plasmo MV3/MV2, React 18 + TS, Tailwind 3.4 (`aa-*` tokens), `chrome.storage.local`,
`@plasmohq/messaging`. No test framework — verification is manual + `pnpm build`
(tsc) and `pnpm build:firefox`. Serialized storage writes go through
`src/storage/savedApplications.ts` (`mutateSavedApplications`).

---

## Data model (target)

`src/types/userProfile.ts`

```ts
// --- collapsed status -------------------------------------------------------
export type ApplicationStatus = "Saved" | "Applied" | "Interviewing" | "Offer" | "Reject"
export const APPLICATION_STATUSES: ApplicationStatus[] =
  ["Saved", "Applied", "Interviewing", "Offer", "Reject"]

// --- interview rounds -----------------------------------------------------
export type RoundType   = "HR" | "Technical" | "Final" | "Custom"
export type RoundFormat = "phone" | "video" | "onsite"

export interface PrepItem {
  text: string
  checked?: boolean     // "feel ready" / "rehearsed"
  pinned?: boolean      // star
  userAdded?: boolean   // typed by the user, not model-seeded
}

export interface RoundPrep {
  companyResearch?: string        // markdown, copied from companyResearchCache at generate time
  companyResearchAt?: string      // ISO
  likelyTopics?: PrepItem[]
  talkingPoints?: PrepItem[]
  topicsPointsAt?: string         // ISO — last LLM generation
  notes?: string                  // user free text; never overwritten by regeneration
}

export type DebriefOutcome = "advance" | "offer" | "reject" | "waiting"

export interface Debrief {
  rating?: 1 | 2 | 3 | 4 | 5
  assessment?: string             // the one-line "how it went" note
  questionsAsked?: string
  followUps?: { text: string; done?: boolean }[]
  outcome?: DebriefOutcome
  loggedAt?: string               // ISO — presence === "logged"
  updatedAt?: string
}

export interface InterviewRound {
  id: string                      // "rnd_" + crypto.randomUUID()
  type: RoundType
  customLabel?: string            // when type === "Custom"
  date?: string                   // "YYYY-MM-DD"; absent === unscheduled
  time?: string                   // "HH:mm"; absent === time TBD
  format?: RoundFormat
  interviewers?: string           // freeform, newline-separated (see open Q2)
  createdAt: string               // ISO
  synthesized?: boolean           // migration-created past round
  prep?: RoundPrep
  debrief?: Debrief
}

export interface SavedApplication {
  // …existing fields…
  rounds?: InterviewRound[]
  // REMOVED after migration: preparationPlan
  // isFavorite — UI removed in Phase 5; field kept readable one release, then dropped
}
```

`chrome.storage.local` new keys:

- `companyResearchCache: Record<string /* company.toLowerCase().trim() */, { text: string; generatedAt: string; parsed?: CompanyInfo }>`
  — `text` is the raw Perplexity content (shown as prose in Prep); `parsed` is the
  existing structured `CompanyInfo` when available. Written by both the Prep engine
  and the side-panel match flow (`dialog.tsx#fetchCompanyInfo`).
- `interviewsSchemaVersion: number` — migration guard, bump to `1`
- `lastRoute: string` — hash of the last-visited screen
- `interviewRemindersEnabled: boolean` — default `true`; single Settings toggle

Manifest (`package.json` → `manifest.permissions` **and** `manifest.overrides.chrome.permissions`):
add `"alarms"`. `"notifications"` is already present.

`src/types/config.ts` — `PerplexityConfig`:

- remove `preparationPlanEnabled`
- rename `preparationPlanPrompt` → `interviewPrepPrompt` (migrate the stored value); it now feeds the topics + talking-points LLM call and is round-type aware via `{{roundType}}`

---

## Routing map

`src/lib/router.ts` — a ~40-line `useHashRoute()` hook (no library). Parses
`location.hash` into `{ area, view, param }`, subscribes to `hashchange`, exposes
`navigate(hash, { replace? })`.

| Hash | Screen |
|---|---|
| `#/applications` (default) | All applications list |
| `#/applications/overview` | Overview |
| `#/interviews/schedule` | Schedule (agenda) |
| `#/interviews/prep` | Prep — Upcoming rounds list |
| `#/interviews/prep/:roundId` | Prep workspace (Ready / Not-started by state) |
| `#/interviews/debriefs` | Debriefs — list |
| `#/interviews/debriefs/:roundId` | Debrief workspace (Blank / Logged by state) |
| `#/settings/:tab` | Settings (existing `activeTab`) |

- Empty/`#/` hash → `lastRoute` from storage, else `#/applications`.
- Legacy `?section=applications\|settings` (popup, retired analytics tab) →
  `navigate(hashEquivalent, { replace: true })` on first load.
- `:roundId` that resolves to no round → redirect to the parent list.

---

## Selectors & mutations

`src/lib/interviews/selectors.ts` (pure, take `SavedApplication[]`):

- `roundsWithApp(apps): { app; round }[]`
- `upcoming(list)` / `past(list)` / `unscheduled(list)` — by `round.date` vs today
- `roundsThisWeek(list)` — dated within the next 7 days → **Schedule rail badge**
- `needsDebrief(list)` — `past` round with no `debrief?.loggedAt` → **Debriefs rail badge**
- `nextRound(list)` — earliest `upcoming` → summary header
- `groupByDay(list)` — agenda day groups
- `roundLabel(round)` — `customLabel ?? {HR:"HR Interview", Technical:"…", …}[type]`

`src/storage/savedApplications.ts` (new helpers, all via `mutateSavedApplications`):

- `addRound(appId, partial): Promise<InterviewRound>` — assigns `id`/`createdAt`;
  **promotes** `status` `Saved`/`Applied` → `Interviewing` (never downgrades from
  `Offer`/`Reject`).
- `updateRound(appId, roundId, patch)`
- `deleteRound(appId, roundId)`
- `setRoundPrep(appId, roundId, patch: Partial<RoundPrep>)`
- `setRoundDebrief(appId, roundId, patch: Partial<Debrief>)` — on `outcome`:
  `offer` → status `Offer`; `reject` → status `Reject`; `advance` / `waiting` → no
  status change. Sets `loggedAt` on first save.

---

## Phase 0 — Schema, migration, selectors

**Goal** The new types compile everywhere, existing data is migrated on load, and
selectors/mutations exist. No user-visible change beyond status labels collapsing.

**Scope** `src/types/userProfile.ts`, `src/types/config.ts`,
`src/lib/interviews/{selectors,migrate}.ts`, `src/storage/savedApplications.ts`,
plus mechanical enum fixes in `ApplicationsList.tsx`, `ApplicationsOverview.tsx`,
`tabs/dialog.tsx` (compile-only; visual polish is Phase 5).

**Tasks**
- Collapse `ApplicationStatus` + `APPLICATION_STATUSES`; add `InterviewRound` &
  friends; add `rounds?` to `SavedApplication`.
- `migrate.ts`:
  - guard on `interviewsSchemaVersion !== 1`.
  - for each app: `LEGACY_STATUS_MAP` (`"HR Interview"|"1st…"|"2nd…"|"Final…"` →
    `"Interviewing"`); `LEGACY_STATUS_TO_ROUND_TYPE`
    (`HR`→`HR`, `1st/2nd Technical`→`Technical`, `Final`→`Final`).
  - if the app had an interview status, push a synthesized round:
    `{ id, type, date: statusUpdatedAt?.slice(0,10) ?? createdAt.slice(0,10),
       synthesized: true, createdAt: now,
       prep: preparationPlan ? { notes: preparationPlan.content,
                                 topicsPointsAt: preparationPlan.generatedAt } : undefined }`.
  - delete `preparationPlan` and `isFavorite` from each app; set
    `interviewsSchemaVersion = 1`.
  - rename `perplexityConfig.preparationPlanPrompt` → `interviewPrepPrompt`
    (keep the stored text), drop `preparationPlanEnabled`.
  - run once from `options.tsx` **and** `background/index.ts` startup (guarded, idempotent).
- Implement `selectors.ts` and the `savedApplications.ts` round helpers.
- Fix every `ApplicationStatus` consumer so `tsc` passes: `STATUS_PILL` maps,
  `INTERVIEW`/`RESPONDED`/`funnelStages` in `ApplicationsOverview.tsx`, the status
  `<select>`s in `ApplicationsList.tsx` and `dialog.tsx`.

**Depends on** —
**Risks** `statusUpdatedAt` can be missing → fall back to `createdAt`; both can be
malformed → guard the `.slice`. `dialog.tsx` also reads `preparationPlan` for UI —
those blocks are removed in Phase 5.
**Multi-device**: a Drive `pull` can bring pre-migration `savedApplications` onto an
already-migrated install (`interviewsSchemaVersion === 1`), where the guard skips
re-migration. Handle in Phase 5's sync pass (re-run `migrateInterviewsSchema` with a
forced version reset after `pull`), or accept as a known edge for now.
**Done when** `pnpm build` + `pnpm build:firefox` clean; migration verified against
a hand-seeded fixture holding all 8 legacy statuses + a `preparationPlan`; a second
load is a no-op.

**Status — DONE.** tsc + both builds clean. Migration verified against fixtures
(8 legacy statuses, `preparationPlan` → `round.prep.notes`, missing
`statusUpdatedAt` → `createdAt`, idempotency, identity return for clean records).
Two deviations from the text above, both narrowing scope:
- `preparationPlan?` / `isFavorite?` / the `PreparationPlan` interface are kept on
  the type as `@deprecated` (not deleted) so `dialog.tsx` compiles untouched. The
  migration still strips both fields from stored records, so the features are dead
  at runtime; the type + UI removal is Phase 5 as planned.
- The `preparationPlanPrompt` → `interviewPrepPrompt` rename + `preparationPlanEnabled`
  removal are **deferred to Phase 3** (where the new engine consumes the prompt),
  keeping Phase 0 off `config.ts` / `perplexityClient.ts` / Settings.
Files: `types/userProfile.ts`, `storage/keys.ts`, `storage/savedApplications.ts`
(round helpers), new `lib/interviews/{migrate,selectors}.ts`, `background/index.ts`
+ `options.tsx` (migration wiring), `components/ApplicationsList.tsx` +
`ApplicationsOverview.tsx` + `tabs/dialog.tsx` (enum fixes). Branch
`feat/interviews-schema`.

---

## Phase 1 — Hash router + rail restructure

**Goal** Every screen is reachable by hash; the Applications rail shows the
`INTERVIEWS` group; `Needs attention` and `Favorites` are gone from the nav; badges
compute.

**Scope** new `src/lib/router.ts`; `src/options.tsx` (view switching); rail markup
(currently inline in `options.tsx` for the Applications section — extract to
`src/components/ApplicationsRail.tsx` mirroring `SettingsRail.tsx`);
`src/popup.tsx`; `package.json` (add `"alarms"` permission to both the base
`manifest.permissions` and `manifest.overrides.chrome.permissions`).

**Tasks**
- `useHashRoute()` + the route table above; `lastRoute` persistence;
  `?section=` → hash redirect.
- Refactor `options.tsx`: derive `section` / `activeTab` / apps-view /
  interviews-view from the route instead of local `useState` + `URL_PARAMS`.
- `ApplicationsRail`: `VIEWS` (All applications, Overview) + `INTERVIEWS`
  (Schedule, Prep, Debriefs). Active row styling per `SettingsRail`. No
  `Needs attention`, no `Favorites`/Starred group.
- Badges: `Schedule` = `roundsThisWeek(apps).length`; `Debriefs` =
  `needsDebrief(apps).length` (hide at 0). Same dark-rail count style as the mocks.
- Shared `BackLink` component (`‹ …`) for the sub-topbar of workspace screens.
- `popup.tsx`: the two launcher links → `#/applications` / `#/settings/<default>`.
- Interviews screens render placeholders for now (`Schedule` / `Prep` / `Debriefs`
  headings) — filled in Phases 2–4.

**Depends on** Phase 0.
**Risks** `options.tsx` is large; do the router swap as a mechanical pass, keeping
every existing handler. Guard against hash-loop when redirecting legacy params
(`replace: true`, and only when a `?section=` is actually present).
**Done when** every nav item routes; browser back/forward moves between screens;
refresh reloads the same screen; badges show correct counts; popup opens the shell
at the right hash.

---

## Phase 2 — Schedule + Add round drawer

**Goal** `#/interviews/schedule` matches the Schedule design; rounds can be added,
edited, and deleted; adding one promotes the application to `Interviewing`.

**Scope** `src/components/interviews/SchedulePage.tsx`, `AgendaDayGroup.tsx`,
`RoundRow.tsx`, `AddRoundDrawer.tsx`, shared `SegmentedControl.tsx` (extract the
"Tone" segmented pattern from `options.tsx` Output-style if not already reusable);
`src/lib/interviews/reminders.ts`; `src/background/index.ts` (alarm listener);
`src/options.tsx` (Settings → a "System"/Interviews toggle for
`interviewRemindersEnabled`).

**Tasks**
- `SchedulePage`:
  - **Summary header** — `Next: <company> · <roundLabel> — in N days` (from
    `nextRound`), `This week: N`, `Awaiting result: N` (past rounds, outcome
    `advance`/`waiting` or no debrief yet — reuse `needsDebrief` + logged-advance).
  - **Agenda** — `Unscheduled` group (if any), then `upcoming` grouped by day
    (`groupByDay`), then an `Earlier` group of `past`. Row = day/time · company ·
    `roundLabel` · type tag · format · `›`. Empty state when no rounds.
  - Row click → `AddRoundDrawer` in **edit mode** (see open Q1).
- `AddRoundDrawer` (create + edit):
  - fields: Application (select; create-mode only, disabled/read-only in edit),
    Round type (select incl. `Custom…` → reveals label input), Date, Time,
    Format (segmented `phone`/`video`/`onsite`), Interviewer(s) (freeform input).
  - "What happens next" note — dynamic: shows the status promotion when relevant.
  - Footer: primary `Add round` (create) / `Save changes` (edit) + `Cancel`;
    edit mode also shows `Delete round`.
  - Submit → `addRound` / `updateRound` / `deleteRound`.
- Wire the Schedule sub-topbar `Add round` button and the row-level entry points.
- **Reminders** (`src/lib/interviews/reminders.ts`):
  - `syncRoundAlarms(round)` — clears `interview-reminder:<roundId>:*` then, if the
    round has `date` + `time` and `interviewRemindersEnabled`, creates
    `chrome.alarms` at `-24h` and `-1h` (skips any already in the past). Called
    from `addRound` / `updateRound`.
  - `clearRoundAlarms(roundId)` — called from `deleteRound` and when a round loses
    its `date`/`time`.
  - `background/index.ts`: `chrome.alarms.onAlarm` → parse the name → look up the
    round → `chrome.notifications.create` (`<company> · <roundLabel>` /
    `<relative time> · <format>`); click → open `options.html#/interviews/schedule`.
  - Toggling `interviewRemindersEnabled` off clears all `interview-reminder:*`
    alarms; on re-syncs from current rounds.
  - Settings: one checkbox ("Remind me before interviews — 1 day and 1 hour ahead").

**Depends on** Phase 1.
**Risks** Date/time inputs — use native `<input type="date">` / `type="time">`
styled to `aa-*` (consistent with existing Settings inputs); keep values as
`"YYYY-MM-DD"` / `"HH:mm"` strings. Timezone: all comparisons are local-date only —
never construct `Date` from the bare `date` string without `T00:00`. `chrome.alarms`
minimum granularity is fine at 24 h / 1 h; the service worker may be asleep when the
alarm fires — that's the normal wake path, just keep the `onAlarm` handler cheap and
`await` the storage read. Re-scheduling a round must clear the *old* alarms first
(name-prefix match) to avoid stale notifications.
**Done when** add / edit / delete all work and reflect in the agenda immediately;
status promotion fires only from `Saved`/`Applied`; a scheduled round creates two
alarms, rescheduling replaces them, deleting clears them, and the toggle off clears
all; a fired alarm shows a notification that deep-links to Schedule; screen matches
the Schedule + Drawer mocks; `pnpm build` clean.

---

## Phase 3 — Prep: engine + list + workspace

**Goal** `#/interviews/prep` lists upcoming rounds with prep state; the workspace
(`#/interviews/prep/:roundId`) matches the Ready and Not-started designs; company
research + topics/points generate and regenerate.

**Scope** background: `src/background/messages/generateCompanyResearch.ts`,
`generateRoundPrep.ts`; `src/api/perplexityClient.ts` (research reuse) &
`src/api/llm/*` + `src/background/prepareGenerateRequest.ts` (topics/points via the
`drafting` route); `src/tabs/dialog.tsx` (cache seeding only);
`src/options.tsx` Settings (repurpose the prompt editor);
components: `PrepListPage.tsx`, `PrepWorkspace.tsx`, `PrepSectionCard.tsx`,
`Checklist.tsx`, `RoundStrip.tsx`.

**Tasks**
- **`generateCompanyResearch`** — takes `{ company, force? }`. Reads
  `companyResearchCache[key]`; on hit (and not `force`) returns it unchanged. On
  miss / `force` runs the existing Perplexity "about the company" call
  (`PerplexityClient.fetchCompanyInfo`, prompt `perplexityConfig.customPrompt`),
  writes `{ text, parsed, generatedAt }` to the cache, returns
  `{ text, generatedAt, cached }`.
- **Match-flow seeding** — in `src/tabs/dialog.tsx#fetchCompanyInfo`, after a
  successful fetch, also write the result into `companyResearchCache[key]` (only if
  absent or older than the fetched one). Small additive change; the prep-UI removal
  in that file is separate (Phase 5).
- **`generateRoundPrep`** — takes `{ roundType, companyName, jobTitle,
  jobDescription?, userProfile }`. **One LLM call on the `drafting` route**
  (`ModelRouting.drafting` — no new route, no new Settings row). Prompt =
  `interviewPrepPrompt` with `{{roundType}}`, `{{companyName}}`, `{{jobTitle}}`,
  `{{jobDescription}}`, `{{userProfile}}`. Returns
  `{ likelyTopics: string[], talkingPoints: string[] }`. If `jobDescription` is
  absent, still generate (company + type + profile) and return a `thinInput: true`
  flag for a UI hint ("add the job description for sharper prep").
- **Settings** — rename the "Interview prep" block to feed the new engine: keep the
  `interviewPrepPrompt` editor (with the new placeholders documented inline);
  remove the `preparationPlanEnabled` toggle. The Perplexity company-research
  prompt editor stays as-is.
- **`PrepListPage`** — stats (`To prep`, `Prepped`, `Upcoming rounds`), the
  `UPCOMING ROUNDS` list: company · `roundLabel` | state pill
  (`Ready` / `Not started` / `Generating…`) | action (`Generate` / `Review`) | `›`.
  Row → `#/interviews/prep/:roundId`.
- **`PrepWorkspace`**:
  - sub-topbar `‹ Prep  /  <company> — <roundLabel>` + `Regenerate all`
    (Ready) / `Generate prep` (Not started).
  - `RoundStrip` — facts line, state pill, `View in Schedule ›`
    (→ `#/interviews/schedule`, scroll/anchor to the round).
  - **Not started** — empty block ("No prep generated yet" + what it produces +
    `✨ Generate prep`). `My notes` card still present.
  - **Ready** — `Company research` card (text + `Copy` + `Regenerate`, "generated
    N ago", `Refresh` re-runs Perplexity), `Likely topics` checklist card,
    `Your talking points` checklist card (`＋ Add talking point`), `My notes` card.
  - `Checklist` — toggling a `PrepItem.checked`, pinning, adding a user item →
    `setRoundPrep`. `My notes` → debounced `setRoundPrep({ notes })`.
  - `Regenerate` per section replaces only that section's items (user-added items
    with `userAdded: true` are preserved; a confirm if the section has checks).

**Depends on** Phases 1 (routing) + 0 (model). Independent of Phase 2 except both
touch the rail.
**Risks** Perplexity/LLM latency — show a `Generating…` state on the round and the
list pill; guard against double-submits. Cache key normalisation (trailing
"Inc."/"Ltd." variants collide or not — lowercased-trimmed is the agreed key;
accept minor dupes). Model routing choice needs an explicit call.
**Done when** generate + per-section regenerate work with and without a JD; checks
and notes persist across reloads; both states match the mocks; old
`PreparationPlanModal` is not imported anywhere.

---

## Phase 4 — Debriefs: list + workspace + outcome→status

**Goal** `#/interviews/debriefs` and `#/interviews/debriefs/:roundId` match the
designs; saving a debrief writes the round and applies the outcome→status rule;
`advance` prompts to schedule the next round.

**Scope** components: `DebriefsListPage.tsx`, `DebriefWorkspace.tsx`,
`RatingInput.tsx`, reuse `RoundStrip.tsx`, `Checklist.tsx`, `AddRoundDrawer.tsx`;
`src/storage/savedApplications.ts` (`setRoundDebrief` outcome side-effects — from
Phase 0, exercised here).

**Tasks**
- **`DebriefsListPage`** — stats (`Needs a debrief`, `Logged`, `Debriefed this
  week`); a `NEEDS A DEBRIEF` list (past rounds, no `loggedAt`) with
  `No debrief` pill + `Add debrief`; a `LOGGED` list below. Rows →
  `#/interviews/debriefs/:roundId`.
- **`DebriefWorkspace`** (one layout, two states by `debrief?.loggedAt`):
  - sub-topbar `‹ Debriefs  /  <roundLabel> — <company> · <date>` +
    `Save & advance` (blank) / `Save changes` (logged).
  - `RoundStrip` — `No debrief yet` (amber) / `Logged <date>` (green).
  - `DEBRIEF` card: **How it went** (`RatingInput` ●●●○○ + `assessment` line),
    **Questions they asked** (textarea → `questionsAsked`), **Follow-ups**
    (`Checklist` of `{text, done}` + `＋ Add a follow-up`), **Outcome**
    (select: `Advance to the next round` / `Offer` / `Reject` / `Still waiting`).
  - Save → `setRoundDebrief(...)`. Then:
    - `offer` → status `Offer`; `reject` → status `Reject`; `waiting` → nothing.
    - `advance` → status unchanged; toast **"Round logged. Schedule the next
      one?"** with an action that opens `AddRoundDrawer` (create mode) pre-filled
      with the application (type unset — see open Q7).
- Navigate back to `#/interviews/debriefs` after save.

**Depends on** Phases 1, 0, and 2 (`AddRoundDrawer` for the advance prompt).
**Risks** Re-saving a logged debrief with a *changed* outcome must re-apply the
status rule (e.g. `reject` → `advance` should move status back to `Interviewing`);
define this explicitly in `setRoundDebrief`. `RatingInput` a11y — radiogroup
semantics, keyboard arrows.
**Done when** debriefs persist; all four outcome transitions verified; the advance
toast opens a correctly pre-filled drawer; both states match the mocks.

---

## Phase 5 — Remove Needs attention + Favorites + old prep feature

**Goal** No dead code or nav for the removed features; the Overview and list
screens read cleanly on the 5-value enum.

**Scope** `src/components/PreparationPlanModal.tsx` (delete),
`src/tabs/dialog.tsx`, `src/components/ApplicationsList.tsx`,
`src/components/ApplicationsOverview.tsx`, `src/options.tsx` (Settings),
`src/api/perplexityClient.ts`, `src/types/userProfile.ts`, `src/types/config.ts`.

**Tasks**
- **Favorites** — remove the `Star` toggle from `ApplicationsList` rows + the
  detail drawer, any favourite filter/sort, **and the `isFavorite` field itself**
  from `SavedApplication` plus every reference. Add a one-line delete of the key in
  the Phase 0 migration so existing records are cleaned up.
- **Needs attention** — delete the 3-column "needs attention" block from
  `ApplicationsOverview.tsx` (`AttentionList`, `stale`/`neverApplied`/
  `recentRejections`). Keep the stat strip, pipeline funnel, and weekly activity;
  rework the funnel/`INTERVIEW`/`RESPONDED` arrays for the 5 statuses.
- **Old prep** — delete `PreparationPlanModal.tsx`; remove `generatePreparationPlan`,
  the modal state, and the `preparationPlan` display blocks from `dialog.tsx`
  (keep the status `<select>`, now 5 values); remove the
  `preparationPlanEnabled` UI from `options.tsx`; drop the
  `preparationPlanPrompt` getter path in `perplexityClient.ts` (superseded by
  `interviewPrepPrompt`, consumed by Phase 3's `generateRoundPrep`).
- Remove `PreparationPlan` interface once nothing reads it (migration in Phase 0
  was the last reader).
- Grep sweep: `preparationPlan`, `isFavorite`, `Needs attention`, `Favorites`,
  `AttentionList`, the 4 legacy status strings.

**Depends on** Phase 0 (enum) for compile; best landed after Phases 3–4 so the
`dialog.tsx` prep removal doesn't leave a gap the user notices.
**Risks** `dialog.tsx` is the side panel — removing prep UI there must not disturb
the match flow (`extracting`→`loading`→`success`→triage→`saveForm`). Touch only the
prep-specific blocks.
**Done when** grep is clean; Overview matches the current design; side panel match
flow still works end to end; both build targets clean.

---

## Phase 6 — End-to-end verification & polish

**Goal** The whole loop works and both build targets are green.

**Tasks**
- Full flow: create application → Add round → generate prep → tick talking points +
  notes → mark round past (date) → Debrief → `advance` → toast → Add next round →
  Debrief → `offer` → status `Offer`.
- Empty states: no rounds (Schedule/Prep/Debriefs), no JD (Prep), no upcoming (rail
  badges hidden), migration from a fresh install (no-op).
- Reminders: schedule a round a few minutes out (temporarily shorten the offsets),
  confirm the notification fires and deep-links to Schedule; reschedule replaces the
  alarm; delete + toggle-off clear it; `chrome://extensions` service-worker asleep
  then woken by the alarm still works.
- Cache seeding: run a match in the side panel for a new company, then open a Prep
  round for it — company research is already present, no Perplexity call.
- Narrow-width: rail collapses at the existing `lg:` breakpoint; drawer and
  workspaces are usable at popup-window width.
- a11y pass on new interactive pieces: `AddRoundDrawer` focus trap + `Esc`,
  `RatingInput` radiogroup, `Checklist` checkboxes, `SegmentedControl` as a
  radiogroup, `BackLink` as a link.
- Export → wipe → import round-trip and a Drive `pull` with `rounds` embedded.
- `pnpm build` && `pnpm build:firefox`.
- Manual pass of every Interviews screen against its canvas artboard.

**Depends on** Phases 2–5.
**Done when** the flow above completes without console errors on Chrome MV3 and the
Firefox MV2 build; export/sync preserves rounds; screens match the mocks.

---

## Resolved (folded into the phases above)

| Q | Answer |
|---|---|
| Schedule row click | `AddRoundDrawer` in **edit mode** (reschedule / format / interviewers / delete). |
| Interviewers field | Freeform `string`, newline per person. `{name;role}[]` upgrade stays additive. |
| Reminders | **Real** `chrome.alarms` + `chrome.notifications`, 24 h + 1 h before, synced on round add/reschedule/delete; default on, one Settings toggle (`interviewRemindersEnabled`). — Phase 2. |
| Company-research cache | Yes. Key `company.toLowerCase().trim()`, no hard TTL, card shows "generated N ago" + `Refresh`. **The side-panel match flow seeds it** (`dialog.tsx#fetchCompanyInfo`). — Phase 3. |
| `isFavorite` | Delete the field + all references **now**; migration strips the key. — Phases 0 + 5. |
| Overview "Needs attention" block | **Fully removed**; funnel + activity + stat strip stay. — Phase 5. |
| Model route (topics/points) | Reuse **`ModelRouting.drafting`**. No new route, no new Settings row. — Phase 3. |
| Custom round + "Advance" | `Custom` has no canonical next → the post-debrief prompt opens Add round with **type unset**. — Phase 4. |
| Unscheduled rounds (`date` absent) | Shown in Schedule under an **`Unscheduled`** group pinned to the top; still listed in Prep. — Phase 2. |
| Prep without a JD | Generation still allowed (company + round type + profile) with a `thinInput` hint. — Phase 3. |

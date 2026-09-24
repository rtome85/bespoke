# Bespoke

> A browser extension that turns a job posting and your profile into tailored
> application materials, then keeps the application and interview work in one
> place.

[![Build](https://github.com/rtome85/bespoke/actions/workflows/submit.yml/badge.svg)](https://github.com/rtome85/bespoke/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Plasmo](https://img.shields.io/badge/built%20with-Plasmo-blueviolet)](https://docs.plasmo.com)

[![Get it on Chrome Web Store](https://img.shields.io/badge/Get%20it%20on-Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/bespoke/fojiljenclkaajpmlhhhepgmlnlllcbd)

https://github.com/user-attachments/assets/49dc9789-5e1f-47c7-97a6-fa50f54e353b

_A real run on a LinkedIn posting: match score, gap check, then a tailored CV
and cover letter. The generation wait is sped up._

## What it does

Bespoke reads a job posting, compares it with your saved profile, and produces
a tailored CV and cover letter. It also provides an application tracker and
round-by-round interview preparation and debrief workspaces.

- Extract job details from LinkedIn and other job boards, with an editable
  review step before generation
- Generate a tailored CV and cover letter, then preview, edit, and export them
  as PDF or Markdown
- Score the fit between a role and your profile, including strengths, gaps, and
  suggested improvements
- Configure separate model routes for scoring, drafting, and interview prep,
  with an optional fallback route
- Use Ollama, OpenAI, Anthropic, Google Gemini, OpenRouter, DeepSeek, Mistral,
  or an OpenAI-compatible custom endpoint
- Research a company through Perplexity, Tavily, Brave Search, Exa, the
  company's own site, or clearly labelled model knowledge
- Track applications from Saved through Applied, Interviewing, Offer, or Reject
- Plan interview rounds with schedules, reminders, research, talking points,
  STAR stories, technical drills, and on-demand lessons
- Record debriefs, follow-ups, and outcomes after each interview
- Back up synced settings and application data to Google Drive

## Install

- **Chrome and Edge:** install from the
  [Chrome Web Store](https://chromewebstore.google.com/detail/bespoke/fojiljenclkaajpmlhhhepgmlnlllcbd). In Edge, allow
  extensions from other stores when prompted.
- **Firefox:** the addons.mozilla.org listing is awaiting review. Until then,
  load the Firefox archive from the
  [latest release](https://github.com/rtome85/bespoke/releases) as a temporary
  add-on via `about:debugging`.

To build from source instead, see [Install and run](#install-and-run).

## Tech stack

| Layer               | Technology                                                                  |
| ------------------- | --------------------------------------------------------------------------- |
| Extension framework | [Plasmo](https://docs.plasmo.com/) — Chrome MV3 and Firefox MV2             |
| UI                  | React 18, TypeScript 5, Tailwind CSS 3                                      |
| AI providers        | Ollama plus OpenAI-compatible and native provider adapters                  |
| Company research    | Perplexity, Tavily, Brave Search, Exa, company sites, or the selected model |
| Exports             | Markdown and PDF via pdfmake                                                |
| Sync                | Google Drive app-data scope                                                 |
| Package manager     | pnpm                                                                        |

## Prerequisites

- A current Node.js LTS release
- pnpm (`npm install -g pnpm`)
- Chrome, Edge, or Firefox
- At least one configured LLM provider to generate or analyse documents

All settings are configured in the extension and stored in browser local
storage; the project does not use a `.env` file.

## Install and run

```bash
git clone https://github.com/rtome85/bespoke.git
cd bespoke
pnpm install

# Watch build for Chrome/Edge development
pnpm dev
```

Load `build/chrome-mv3-dev` as an unpacked extension:

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose `build/chrome-mv3-dev`.

The development build updates as source files change. Open the extension's
Options page to add your profile and provider credentials.

### Production builds

```bash
# Chrome / Edge (MV3)
pnpm build
pnpm package

# Firefox (MV2)
pnpm build:firefox
pnpm package:firefox
```

Chrome's production build is written to `build/chrome-mv3-prod/`; `pnpm package`
creates the store-submission archive.

## Configure providers and research

In **Options → Settings → Providers**, enable one or more providers and test
their connections. Bespoke supports:

| Provider                                                        | Credential                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| Ollama                                                          | Optional API key; local or cloud base URL                   |
| OpenAI, Anthropic, Google Gemini, OpenRouter, DeepSeek, Mistral | API key                                                     |
| Custom endpoint                                                 | Base URL for an OpenAI-compatible service; API key optional |

Choose the provider and model independently for match scoring, document drafting,
and interview prep in **Model routing**. A fallback route can take over when a
primary provider fails.

Company research is optional. Connect Perplexity or one web-search provider
(Tavily, Brave Search, or Exa), or allow the extension to use the company site
when a saved posting URL makes it available. In automatic mode, Bespoke prefers
the best configured source and identifies the source in the result.

## Typical workflow

1. Add your work history, skills, education, projects, languages, and contact
   information on the Profile settings screen.
2. Visit a job posting and use the extension icon or the **Generate CV for this
   job** context-menu action.
3. Check and amend the extracted company, role, and job description.
4. Run the match analysis and generate your CV and cover letter.
5. Preview, edit, download, or save the materials with the application record.
6. In **Applications**, update the status and add interview rounds as you hear
   back.
7. Use each round's Prep workspace to prepare research, question drills, talking
   points, STAR stories, and technical exercises; then log a debrief afterward.

## Settings at a glance

- **Output style**: writing tone, CV emphasis, bullet density, reading level,
  output language, temperature, top-p, and maximum tokens
- **Prompts**: editable CV and cover-letter prompt templates
- **Notifications**: interview reminder settings
- **Backup & sync**: Google Drive authorisation, backup, and restore
- **Storage**: local storage usage and data-transfer controls

## Project structure

```
src/
├── api/llm/                 # Provider-agnostic LLM clients and adapters
├── background/              # Service worker, context menu, message handlers
├── components/
│   ├── dialog/              # Job-match and document-generation flow
│   ├── interviews/          # Schedule, prep, and debrief workspaces
│   ├── options/             # Application and settings screens
│   └── profile/             # Profile editors
├── contents/jobScrapper.ts  # Job-posting content script
├── hooks/                   # UI state and storage integration
├── lib/                     # Routing, interview domain, PDF, selectors
├── storage/                 # Storage keys and serialized application updates
├── tabs/                    # Dialog, analytics, and document-preview entrypoints
├── types/                   # Domain and configuration types
├── options.tsx              # Full options-page shell
└── popup.tsx                # Toolbar popup
```

## Development checks

There is no automated test suite. Before submitting a change, run:

```bash
npx tsc --noEmit
pnpm build
pnpm build:firefox
```

## Publishing

The `Submit to Web Store` GitHub Actions workflow is manually triggered from
`main`. It builds and packages the Chrome MV3 extension before publishing with
[Browser Platform Publisher](https://docs.plasmo.com/framework/workflows/submit).
The repository needs a `SUBMIT_KEYS` secret containing the store credentials.

## Contributing

Use `dev` as the integration target: create a scoped branch, make the change,
and open a pull request to `dev`. Keep commits in the Conventional Commits form,
for example `feat(interviews): add prep reminders`.

Prettier is the formatting gate. Avoid formatting unrelated pre-existing code;
check changed files with:

```bash
npx prettier --check <file>
```

## License

MIT — see [LICENSE](LICENSE).

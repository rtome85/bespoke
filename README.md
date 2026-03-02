# JobTailor

> A browser extension that automatically tailors your CV and cover letter to any job posting using local LLMs.

[![Build](https://github.com/rtome85/jobtailor/actions/workflows/submit.yml/badge.svg)](https://github.com/rtome85/jobtailor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Plasmo](https://img.shields.io/badge/built%20with-Plasmo-blueviolet)](https://docs.plasmo.com)

---

## What it does

JobTailor is a Chrome/Edge extension that reads a job posting you're viewing, then uses an LLM to generate a tailored resume and cover letter based on your personal profile — in seconds.

**Key features:**

- **Smart job scraping** — Automatically extracts job title, company, and description from LinkedIn and other job boards
- **LLM-powered tailoring** — Rewrites your CV to highlight the most relevant skills and experience for each role
- **Cover letter generation** — Produces a customized cover letter matching the job requirements and your tone preferences
- **Application tracker** — Tracks jobs you've applied to with status stages (Applied → Offer / Reject)
- **Google Drive sync** — Backs up your profile and settings across devices automatically
- **Customizable prompts** — Edit the prompts sent to the LLM; includes Standard, Tech/Engineering, and Creative templates
- **LLM fine-tuning** — Adjust temperature, top-P, max tokens, writing tone, and more

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Plasmo](https://docs.plasmo.com/) (Manifest V3) |
| UI | React 18, TypeScript 5, Tailwind CSS 3 |
| Icons | Lucide React |
| LLM | Ollama API (self-hosted or cloud) |
| Cloud sync | Google Drive API (app data scope) |
| Package manager | pnpm |
| CI/CD | GitHub Actions + bpp (Browser Platform Publisher) |

---

## Prerequisites

- **Node.js** 16+
- **pnpm** — `npm install -g pnpm`
- **Ollama** — a running Ollama instance (local or cloud endpoint)
- **Chrome** or **Edge** browser

---

## Installation

```bash
# Clone the repo
git clone https://github.com/rtome85/jobtailor.git
cd jobtailor

# Install dependencies
pnpm install
```

### Development

```bash
pnpm dev
```

Then load the unpacked extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `build/chrome-mv3-dev`

The extension hot-reloads as you edit source files.

### Production build

```bash
pnpm build
```

Outputs to `build/chrome-mv3-prod/`. To create a zip ready for store submission:

```bash
pnpm package
```

---

## Configuration

All configuration is stored in Chrome's local storage — no `.env` file is needed. Set everything through the extension's **Options** page after loading it.

### Required

| Setting | Description | Where to set |
|---|---|---|
| Ollama Base URL | URL of your Ollama API (e.g. `http://localhost:11434/api`) | Options → Settings |
| Ollama API Key | API key if your endpoint requires authentication | Options → Settings |

### Optional

| Setting | Description | Default |
|---|---|---|
| LLM Model | Which Ollama model to use | `gpt-oss:20b-cloud` |
| Temperature | Response randomness (0.1–1.5) | `0.7` |
| Writing tone | Professional / Conversational / Technical | Professional |
| Google Drive sync | Backup profile and settings to Drive | Disabled |

### Supported models

- `gpt-oss:20b-cloud` — recommended, fast
- `gpt-oss:120b-cloud`
- `deepseek-v3.1:671b-cloud`
- `qwen3-coder:480b-cloud`
- Any Ollama-compatible model

---

## Usage

### Generate a tailored CV

1. Navigate to a job posting on LinkedIn (or any supported job board)
2. Click the JobTailor extension icon **or** right-click and select **Generate CV for this job**
3. Review the extracted job details in the dialog
4. Click **Generate** — your tailored resume and cover letter will be created
5. Download the documents directly from the dialog

### Set up your profile

Open the extension's **Options** page to enter:

- Personal information (name, contact, summary)
- Work experience
- Skills
- Education
- Certifications
- Projects
- Languages

Your profile is the source material the LLM uses to generate tailored documents.

### Track applications

The **Applications** tab in Options shows all jobs you've generated documents for. Update each application's status as it progresses:

```
Applied → HR Interview → 1st Technical → 2nd Technical → Final Interview → Offer / Reject
```

### Google Drive sync

Enable Drive sync in Options → Settings to automatically back up your profile across devices. Changes sync with a 2-second debounce after any update.

---

## Project structure

```
src/
├── api/
│   └── ollamaClient.ts          # LLM API client (generate, cover letter, match analysis)
├── background/
│   ├── index.ts                 # Service worker (auto-sync, context menu)
│   ├── context-menu.ts          # Right-click menu handler
│   └── messages/
│       ├── generateDocuments.ts # Document generation message handler
│       └── testOllamaConnection.ts
├── components/                  # Reusable React UI components
│   ├── PersonalInfo.tsx
│   ├── ExperienceEditor.tsx
│   ├── SkillEditor.tsx
│   ├── Education.tsx
│   ├── CertificateEditor.tsx
│   ├── ProjectEditor.tsx
│   ├── LanguageEditor.tsx
│   ├── ModelSelector.tsx
│   ├── PromptDialog.tsx
│   └── Tabs.tsx
├── contents/
│   └── jobScrapper.ts           # Content script — extracts job data from pages
├── storage/
│   └── keys.ts                  # Chrome storage key constants
├── tabs/
│   └── dialog.tsx               # CV generation dialog window
├── types/
│   ├── userProfile.ts           # UserProfile, SavedApplication types
│   └── config.ts                # OllamaConfig, LLMTuningConfig, CustomPrompts
├── utils/
│   ├── googleDriveSync.ts       # Drive push/pull/authorize/revoke
│   └── documentFormatter.ts     # Output formatting utilities
├── popup.tsx                    # Extension popup
└── options.tsx                  # Settings/options page
```

---

## Chrome storage keys

| Key | Contents |
|---|---|
| `userProfile` | Full CV data (personal info, experience, skills, etc.) |
| `ollamaConfig` | API URL, key, enabled flag |
| `customPrompts` | System and user prompt templates |
| `llmTuning` | Temperature, top-P, max tokens, tone, focus, strictness |
| `lastSelectedModel` | User's preferred LLM model |
| `savedApplications` | Application tracker entries |
| `syncConfig` | Google Drive OAuth token |
| `promptsVersion` | Prompt template version for migration |

---

## Deployment

Releases are submitted automatically to the Chrome Web Store and Edge Add-ons via GitHub Actions.

```yaml
# .github/workflows/submit.yml
# Trigger: manual workflow dispatch
# Steps: install → build → package → publish via bpp
```

**To publish a new release:**

1. Merge changes to `main`
2. Go to **Actions** → **Submit** → **Run workflow**

Requires a `SUBMIT_KEYS` repository secret containing web store credentials (see [bpp docs](https://docs.plasmo.com/framework/workflows/submit)).

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request against `main`

### Code style

The project uses Prettier with import sorting. Format before committing:

```bash
pnpm dlx prettier --write .
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

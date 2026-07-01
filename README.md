# Bespoke

> A browser extension that automatically tailors your CV and cover letter to any job posting using local LLMs.

[![Build](https://github.com/rtome85/bespoke/actions/workflows/submit.yml/badge.svg)](https://github.com/rtome85/bespoke/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Plasmo](https://img.shields.io/badge/built%20with-Plasmo-blueviolet)](https://docs.plasmo.com)

---

## What it does

Bespoke is a Chrome/Edge extension that reads a job posting you're viewing, then uses an LLM to generate a tailored resume and cover letter based on your personal profile — in seconds.

**Key features:**

- **Smart job scraping** — Extracts job title, company, and description from LinkedIn and any other job board via LLM-powered parsing
- **Editable job description** — Reviews and lets you correct the LLM-extracted JD before generating documents, so dropped or garbled content can be fixed in place
- **LLM-powered tailoring** — Rewrites your CV to highlight the most relevant skills and experience for each role
- **Cover letter generation** — Produces a customized cover letter matching the job requirements and your tone preferences
- **PDF & Markdown export** — Download your resume and cover letter as PDF or raw Markdown
- **Match analysis** — Scores your profile against the job on four dimensions (skills coverage, experience match, domain fit, bonus skills) with strengths, weaknesses, and actionable improvements
- **Company research** — Fetches industry, size, description, notable products, and Glassdoor/Indeed/Teamlyzer ratings via Perplexity Sonar
- **Interview preparation plan** — Generates a tailored technical interview prep guide (questions, coding challenges, deep-dive topics) via Perplexity
- **Application tracker** — Tracks jobs you've applied to with status stages, tags, notes, and favourites
- **Analytics dashboard** — Visualises your application pipeline with funnel charts and summary stats
- **Google Drive sync** — Backs up your profile and settings across devices automatically
- **Customizable prompts** — Edit the prompts sent to the LLM; includes Standard, Tech/Engineering, and Creative/Portfolio templates
- **LLM fine-tuning** — Adjust temperature, top-P, max tokens, writing tone, resume focus, and match strictness

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Plasmo](https://docs.plasmo.com/) (Manifest V3) |
| UI | React 18, TypeScript 5, Tailwind CSS 3 |
| Icons | Lucide React |
| LLM | Ollama API (self-hosted or cloud) |
| Company research | Perplexity Sonar API (optional) |
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
git clone https://github.com/rtome85/bespoke.git
cd bespoke

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
| Top-P | Nucleus sampling cutoff | `0.9` |
| Max tokens | Maximum tokens per LLM call | `4096` |
| Writing tone | Formal / Professional / Conversational | Professional |
| Resume focus | Skills-led / Experience-led / Balanced | Balanced |
| Match strictness | Strict / Balanced / Generous | Balanced |
| Perplexity API Key | Enables company research and interview prep plans | Disabled |
| Google Drive sync | Backup profile and settings to Drive | Disabled |

### Supported models

| Model ID | Name | Notes |
|---|---|---|
| `gpt-oss:20b-cloud` | GPT-OSS 20B | **Recommended** — fast, cost-effective |
| `gpt-oss:120b-cloud` | GPT-OSS 120B | Higher quality, same family |
| `gemma4:31b-cloud` | Gemma 4 31B | Google's latest; strong writing quality |
| `minimax-m2.5:cloud` | MiniMax M2.5 | MoE, fast structured generation |
| `devstral-small-2:24b-cloud` | DevStral Small 2 24B | MoE, reliable for CV tailoring |
| `glm-4.7:cloud` | GLM-4.7 | MoE, fast structured generation |
| *(any Ollama model)* | — | Enter the model ID manually |

---

## Usage

### Generate a tailored CV

1. Navigate to a job posting on LinkedIn or any job board
2. Right-click and select **Generate CV for this job** (or click the extension icon)
3. Wait for the LLM to extract the job details — a loading spinner shows while extraction runs
4. **Review the extracted job description** in the dialog and edit it if any information was dropped or garbled
5. Confirm the company name, job title, and AI model, then click **Generate CV + Cover Letter**
6. Download your tailored resume and cover letter as **PDF** or **Markdown**

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

### Understand your match score

After generation, the **Application Analysis** screen shows:

- **Match score** — weighted composite across skills coverage (40%), experience match (30%), domain fit (20%), and bonus skills (10%)
- **Strengths** — areas where your profile aligns well with the role
- **Weaknesses** — gaps the LLM identified
- **Improvements** — actionable steps to strengthen your application
- **Company card** — industry, size, description, notable products, and employer ratings (requires Perplexity API key)

### Track applications

Save any application from the results screen. Each entry tracks:

- Status: `Saved → Applied → HR Interview → 1st Technical → 2nd Technical → Offer / Reject`
- Tags and favourites for filtering
- Notes for interview contacts and reminders
- Saved resume and cover letter (optional)
- Match percentage

The **Analytics** tab shows a pipeline funnel and summary statistics across all saved applications.

### Interview preparation plan

When an application reaches an interview stage, open it in the tracker and click **Generate Preparation Plan**. Perplexity generates a structured guide with:

- Key technologies and expected proficiency levels
- 8–12 technical questions with answer outlines
- Coding challenge suggestions
- Deep-dive topics specific to the company's stack

Requires a Perplexity API key configured in Options → Settings.

### Google Drive sync

Enable Drive sync in Options → Settings to automatically back up your profile and settings across devices. Changes sync with a 2-second debounce after any update.

---

## Project structure

```
src/
├── api/
│   ├── ollamaClient.ts          # LLM client (generate, cover letter, match analysis, JD extraction)
│   └── perplexityClient.ts      # Perplexity client (company research, interview prep plans)
├── background/
│   ├── index.ts                 # Service worker (auto-sync, context menu)
│   ├── context-menu.ts          # Right-click menu handler + LLM job extraction
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
│   ├── PreparationPlanModal.tsx
│   ├── AnalyticsDashboard.tsx
│   ├── ArrayInput.tsx
│   ├── DatePicker.tsx
│   └── Tabs.tsx
├── contents/
│   └── jobScrapper.ts           # Content script — extracts job data from pages
├── storage/
│   └── keys.ts                  # Chrome storage key constants
├── tabs/
│   ├── dialog.tsx               # CV generation dialog (form, loading, results, tracker)
│   └── analytics.tsx            # Analytics dashboard tab
├── types/
│   ├── userProfile.ts           # UserProfile, SavedApplication types
│   └── config.ts                # OllamaConfig, PerplexityConfig, LLMTuningConfig, CustomPrompts
├── utils/
│   ├── googleDriveSync.ts       # Drive push/pull/authorize/revoke
│   └── documentFormatter.ts     # Output formatting utilities
├── lib/
│   └── pdf/                     # PDF export (markdown → PDF via pdfmake)
├── popup.tsx                    # Extension popup
└── options.tsx                  # Settings/options page
```

---

## Chrome storage keys

| Key | Contents |
|---|---|
| `userProfile` | Full CV data (personal info, experience, skills, etc.) |
| `ollamaConfig` | API URL, key, enabled flag |
| `perplexityConfig` | Perplexity API key, enabled flag, custom prompts |
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

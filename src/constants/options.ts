import {
  Bell,
  Boxes,
  Briefcase,
  CloudCog,
  FileText,
  Folder,
  GraduationCap,
  Languages as LanguagesIcon,
  Route,
  SlidersHorizontal,
  User,
  Zap
} from "lucide-react"

import type { LLMProviderId } from "~types/config"
import type { SettingsNavGroup } from "~types/options"

export const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "AI Models",
    items: [
      {
        label: "Providers",
        value: "providers",
        subtitle: "Model accounts and API keys",
        icon: Boxes
      },
      {
        label: "Model routing",
        value: "model-routing",
        subtitle: "Which model runs each job",
        icon: Route
      }
    ]
  },
  {
    label: "Generation",
    items: [
      {
        label: "Output style",
        value: "output-style",
        subtitle: "How the AI scores and writes",
        icon: SlidersHorizontal
      },
      {
        label: "Prompts",
        value: "prompts",
        subtitle: "Presets and the raw text sent to the model",
        icon: FileText
      }
    ]
  },
  {
    label: "Profile",
    items: [
      {
        label: "Personal info",
        value: "personal-info",
        subtitle: "Your contact and personal details",
        icon: User
      },
      {
        label: "Education",
        value: "education",
        subtitle: "Degrees, certificates, and training",
        icon: GraduationCap
      },
      {
        label: "Skills",
        value: "skills",
        subtitle: "Technical and soft skills",
        icon: Zap
      },
      {
        label: "Experience",
        value: "experience",
        subtitle: "Work history and achievements",
        icon: Briefcase
      },
      {
        label: "Projects",
        value: "projects",
        subtitle: "Personal and open-source projects",
        icon: Folder
      },
      {
        label: "Languages",
        value: "languages",
        subtitle: "Languages you speak",
        icon: LanguagesIcon
      }
    ]
  },
  {
    label: "System",
    items: [
      {
        label: "Notifications",
        value: "notifications",
        subtitle: "Interview reminders and debrief nudges",
        icon: Bell
      },
      {
        label: "Backup & sync",
        value: "backup-sync",
        subtitle: "Export, import, and Google Drive sync",
        icon: CloudCog
      }
    ]
  }
]

export const PROVIDER_IDS: LLMProviderId[] = [
  "ollama",
  "openai",
  "anthropic",
  "google"
]

export const STRICTNESS = ["strict", "balanced", "generous"] as const
export const TONE = ["formal", "professional", "conversational"] as const
export const FOCUS = ["skills", "balanced", "experience"] as const
export const BULLET_DENSITY = ["concise", "standard", "detailed"] as const
export const READING_LEVEL = ["simple", "standard", "advanced"] as const

export const COVER_LETTER_SAMPLE =
  "I'm applying for the Senior Frontend Engineer role because your checkout rebuild is exactly the kind of high-stakes, metrics-driven work I do best."

export const SAMPLE_BULLETS: Record<
  (typeof TONE)[number],
  Record<(typeof FOCUS)[number], string>
> = {
  formal: {
    skills:
      "Applied React and TypeScript to deliver a production checkout flow, achieving a 12% uplift in conversion.",
    balanced:
      "Led a team of six engineers in rebuilding the checkout flow in React and TypeScript, improving conversion by 12%.",
    experience:
      "As Lead Engineer, directed the checkout rebuild across a six-person team, delivering a 12% conversion gain."
  },
  professional: {
    skills:
      "Built the checkout flow in React and TypeScript, lifting conversion 12% and cutting page weight by a third.",
    balanced:
      "Led a team of six engineers to rebuild the checkout flow in React and TypeScript, lifting conversion 12% and cutting page weight by a third.",
    experience:
      "Led a six-engineer team through the checkout rebuild — shipped in two quarters, +12% conversion, −33% page weight."
  },
  conversational: {
    skills:
      "Rebuilt checkout in React + TypeScript and got conversion up 12% while trimming a third of the page weight.",
    balanced:
      "Ran a six-person team to rebuild checkout in React + TypeScript — conversion went up 12% and the page got a third lighter.",
    experience:
      "Led six engineers through the checkout rebuild; we shipped in two quarters and conversion jumped 12%."
  }
}

export const SETTINGS_DEFAULT_TAB = "providers"

export const RAIL_HASH: Record<string, string> = {
  all: "#/applications",
  overview: "#/applications/overview",
  schedule: "#/interviews/schedule",
  prep: "#/interviews/prep",
  debriefs: "#/interviews/debriefs"
}

import {
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
        label: "Backup & sync",
        value: "backup-sync",
        subtitle: "Export, import, and Google Drive sync",
        icon: CloudCog
      }
    ]
  }
]

export const CARD_CLASS =
  "bg-aa-surface border border-aa-border rounded-aa-lg p-aa-6"

export const INPUT_CLASS =
  "w-full px-3 py-[10px] bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm focus:outline-none focus:border-aa-primary transition-colors"

export const TEXTAREA_CLASS =
  "w-full px-3 py-[10px] bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-secondary text-xs font-mono leading-relaxed focus:outline-none focus:border-aa-primary transition-colors"

export const LABEL_CLASS =
  "block text-[12px] font-semibold text-aa-text-secondary mb-2"

export const HINT_CLASS = "text-[11px] text-aa-text-secondary mt-1"

export const SECTION_HEADING_CLASS =
  "text-[16px] font-semibold tracking-[-0.2px] text-aa-text-primary mb-3"

export const OUTLINE_BUTTON_CLASS =
  "px-4 py-[9px] bg-aa-surface border border-aa-primary text-aa-primary rounded-aa-md text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors hover:bg-aa-primary-soft"

export const ACCENT_BUTTON_CLASS =
  "px-4 py-[9px] bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-md text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors hover:bg-aa-primary-hover"

export const SECONDARY_BUTTON_CLASS =
  "px-4 py-[9px] bg-aa-surface border border-aa-border text-aa-text-secondary rounded-aa-md text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors hover:bg-aa-neutral-100"

export const SUCCESS_MESSAGE_CLASS =
  "bg-aa-success-soft text-aa-success-strong px-4 py-3 rounded-aa-md text-sm"

export const ERROR_MESSAGE_CLASS =
  "bg-aa-error-soft text-aa-error-strong px-4 py-3 rounded-aa-md text-sm"

export const INFO_MESSAGE_CLASS =
  "bg-aa-neutral-50 border border-aa-border text-aa-neutral-700 px-4 py-3 rounded-aa-md text-sm"

export const DIVIDER_CLASS = "border-0 border-t border-aa-border my-5"

export const PROVIDER_IDS: LLMProviderId[] = [
  "ollama",
  "openai",
  "anthropic",
  "google"
]

export const STRICTNESS = ["strict", "balanced", "generous"] as const
export const TONE = ["formal", "professional", "conversational"] as const
export const FOCUS = ["skills", "balanced", "experience"] as const

export const STRICTNESS_NOTE: Record<(typeof STRICTNESS)[number], string> = {
  strict:
    "Rigorous — gaps and missing must-haves are weighted heavily; a single unmet requirement can drop the score sharply.",
  balanced:
    "Balanced — explicit requirements and transferable skills weigh equally. A missing must-have costs about 10 points.",
  generous:
    "Lenient — transferable skills and potential count for a lot; only large gaps move the score much."
}

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

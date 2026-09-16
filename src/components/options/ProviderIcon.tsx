import { Server } from "lucide-react"
import AnthropicIcon from "react:~assets/providers/anthropic.svg"
import DeepSeekIcon from "react:~assets/providers/deepseek.svg"
import GoogleIcon from "react:~assets/providers/google.svg"
import MistralIcon from "react:~assets/providers/mistral.svg"
import OllamaIcon from "react:~assets/providers/ollama.svg"
import OpenAIIcon from "react:~assets/providers/openai.svg"
import OpenRouterIcon from "react:~assets/providers/openrouter.svg"
import PerplexityIcon from "react:~assets/providers/perplexity.svg"

import type { RosterProviderId } from "~lib/options/providerStatus"

/**
 * Brand marks for the providers roster, drawn monochrome so they take the
 * surrounding text colour like every other icon in the settings chrome. The
 * custom endpoint has no brand, so it gets a generic server glyph.
 */
const ICONS: Record<
  RosterProviderId,
  React.FunctionComponent<React.SVGProps<SVGSVGElement>>
> = {
  ollama: OllamaIcon,
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  openrouter: OpenRouterIcon,
  deepseek: DeepSeekIcon,
  mistral: MistralIcon,
  custom: Server,
  perplexity: PerplexityIcon
}

interface Props {
  id: RosterProviderId
  className?: string
}

export function ProviderIcon({ id, className }: Props) {
  const Icon = ICONS[id]
  return <Icon className={className} aria-hidden="true" focusable="false" />
}

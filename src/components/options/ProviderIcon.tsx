import AnthropicIcon from "react:~assets/providers/anthropic.svg"
import GoogleIcon from "react:~assets/providers/google.svg"
import OllamaIcon from "react:~assets/providers/ollama.svg"
import OpenAIIcon from "react:~assets/providers/openai.svg"
import PerplexityIcon from "react:~assets/providers/perplexity.svg"

import type { RosterProviderId } from "~lib/options/providerStatus"

/**
 * Brand marks for the providers roster, drawn monochrome so they take the
 * surrounding text colour like every other icon in the settings chrome.
 */
const ICONS: Record<
  RosterProviderId,
  React.FunctionComponent<React.SVGProps<SVGSVGElement>>
> = {
  ollama: OllamaIcon,
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
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

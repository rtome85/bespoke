import { INPUT_CLASS } from "~constants/options"
import { encodeRoute, providerModels } from "~lib/options/modelRouting"
import {
  PROVIDER_META,
  type LLMProviderId,
  type ProvidersConfig,
  type RouteTarget
} from "~types/config"

interface Props {
  target: RouteTarget
  connectedProviders: LLMProviderId[]
  providers: ProvidersConfig
  disabled: boolean
  ariaLabel: string
  id?: string
  onChange: (value: string) => void
}

export function ModelRouteSelect({
  target,
  connectedProviders,
  providers,
  disabled,
  ariaLabel,
  id,
  onChange
}: Props) {
  const targetRoute = encodeRoute(target)
  const hasTargetOption = connectedProviders.some(
    (provider) =>
      provider === target.provider &&
      providerModels(provider, providers).includes(target.model)
  )
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={targetRoute}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`${INPUT_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}>
      {!hasTargetOption && (
        <option value={targetRoute}>
          {PROVIDER_META[target.provider].name} · {target.model} (not connected)
        </option>
      )}
      {connectedProviders.map((provider) => (
        <optgroup key={provider} label={PROVIDER_META[provider].name}>
          {providerModels(provider, providers).map((model) => (
            <option
              key={`${provider}::${model}`}
              value={`${provider}::${model}`}>
              {PROVIDER_META[provider].name} · {model}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

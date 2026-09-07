/** Small pill segmented control on `aa-*` tokens (extracted from the Settings
 * "Tone" control). Behaves as a radiogroup. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-aa-md border border-aa-border p-[3px]">
      {options.map((opt) => {
        const on = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-aa-sm text-[12px] font-semibold transition-colors ${
              on
                ? "bg-aa-primary text-aa-text-on-primary"
                : "text-aa-text-secondary hover:text-aa-text-primary"
            }`}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

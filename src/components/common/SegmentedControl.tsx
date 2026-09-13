import { useRef } from "react"
import type { KeyboardEvent } from "react"

/** Small pill segmented control on `aa-*` tokens (extracted from the Settings
 * "Tone" control). Behaves as a radiogroup: one tab stop, arrows move and
 * select, Home/End jump to the ends. */
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
  const groupRef = useRef<HTMLDivElement>(null)

  // Selection follows focus, per the ARIA radiogroup pattern — move the DOM
  // focus too so the ring tracks the checked pill.
  const select = (index: number) => {
    const next = options[index]
    if (!next) return
    onChange(next.value)
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>('button[role="radio"]')
      [index]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const current = options.findIndex((o) => o.value === value)
    const from = current === -1 ? 0 : current
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      select((from + 1) % options.length)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      select((from - 1 + options.length) % options.length)
    } else if (e.key === "Home") {
      e.preventDefault()
      select(0)
    } else if (e.key === "End") {
      e.preventDefault()
      select(options.length - 1)
    }
  }

  // No option matching `value` (unset / stale) would leave the group with no
  // tab stop at all — fall back to making the first pill the entry point.
  const hasSelection = options.some((o) => o.value === value)

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="inline-flex rounded-aa-md border border-aa-border p-[3px]">
      {options.map((opt, i) => {
        const on = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (!hasSelection && i === 0) ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-aa-sm text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary ${
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

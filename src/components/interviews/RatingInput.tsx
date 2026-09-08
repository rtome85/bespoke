import { useId } from "react"

type Rating = 1 | 2 | 3 | 4 | 5

interface Props {
  value?: Rating
  onChange: (v: Rating) => void
  label?: string
}

const DOTS: Rating[] = [1, 2, 3, 4, 5]

/** ●●●○○ 1–5 picker with radiogroup semantics and arrow-key support. */
export function RatingInput({ value, onChange, label = "Rating" }: Props) {
  const groupId = useId()

  const move = (delta: number) => {
    const current = value ?? 0
    const next = Math.min(5, Math.max(1, current + delta)) as Rating
    onChange(next)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault()
      move(1)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault()
      move(-1)
    } else if (e.key === "Home") {
      e.preventDefault()
      onChange(1)
    } else if (e.key === "End") {
      e.preventDefault()
      onChange(5)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-1.5"
      onKeyDown={onKeyDown}>
      {DOTS.map((n) => {
        const filled = value != null && n <= value
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${n} of 5`}
            id={`${groupId}-${n}`}
            tabIndex={selected || (value == null && n === 1) ? 0 : -1}
            onClick={() => onChange(n)}
            className={`w-5 h-5 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary ${
              filled
                ? "bg-aa-primary border-aa-primary"
                : "bg-transparent border-aa-neutral-400 hover:border-aa-primary"
            }`}
          />
        )
      })}
      <span className="ml-1.5 text-[12px] text-aa-text-secondary tabular-nums">
        {value != null ? `${value}/5` : "—"}
      </span>
    </div>
  )
}

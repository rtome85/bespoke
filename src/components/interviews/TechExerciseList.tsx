import { Check, Star, X } from "lucide-react"

import type { TechExercise } from "~types/userProfile"

interface Props {
  items: TechExercise[]
  onChange: (next: TechExercise[]) => void
}

/**
 * Exercises to work through before a technical round.
 *
 * Read-only prose, like the STAR stories it replaces: an exercise is done at a
 * keyboard somewhere else, and the useful interaction here is ticking it once
 * it has been. `approach` is kept visually separate from the task so it can be
 * skipped on the first attempt and read as a self-review afterwards.
 */
export function TechExerciseList({ items, onChange }: Props) {
  const patch = (i: number, p: Partial<TechExercise>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)))

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  if (!items.length) {
    return (
      <p className="text-aa-13 text-aa-text-secondary">
        No exercises yet — regenerate with a job description saved on this
        application and they get built from the stack it names.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((item, i) => (
        <div key={i} className="group">
          <div className="flex items-start gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={!!item.checked}
              aria-label={`Worked through: ${item.title}`}
              onClick={() => patch(i, { checked: !item.checked })}
              className={`mt-0.5 w-4 h-4 shrink-0 grid place-items-center rounded-aa-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary ${
                item.checked
                  ? "bg-aa-primary border-aa-primary text-aa-text-on-primary"
                  : "border-aa-border hover:border-aa-neutral-400"
              }`}>
              {item.checked && <Check className="w-3 h-3" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-aa-13 font-semibold text-aa-text-primary leading-snug">
                {item.title}
              </p>
              {item.topic && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-aa-pill bg-aa-neutral-100 text-aa-10 font-semibold text-aa-text-secondary">
                  {item.topic}
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label={item.pinned ? "Unpin" : "Pin"}
              onClick={() => patch(i, { pinned: !item.pinned })}
              className={`shrink-0 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary rounded-aa-sm ${
                item.pinned
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              }`}>
              <Star
                className={`w-3.5 h-3.5 ${
                  item.pinned ? "text-aa-primary" : "text-aa-neutral-400"
                }`}
                fill={item.pinned ? "currentColor" : "none"}
              />
            </button>
            {item.userAdded && (
              <button
                type="button"
                aria-label="Remove"
                onClick={() => remove(i)}
                className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-aa-neutral-400 hover:text-aa-error-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary rounded-aa-sm">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="mt-2 text-aa-13 text-aa-neutral-700 leading-relaxed whitespace-pre-line">
            {item.prompt}
          </p>

          {item.approach && (
            <div className="mt-2 border-l-2 border-aa-border pl-3">
              <p className="text-aa-11 font-semibold uppercase tracking-wider text-aa-text-secondary">
                What a strong answer shows
              </p>
              <p className="mt-1 text-aa-13 text-aa-neutral-700 leading-relaxed whitespace-pre-line">
                {item.approach}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

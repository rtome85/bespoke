import { Check, Star, X } from "lucide-react"

import type { GapDefense } from "~types/userProfile"

interface Props {
  items: GapDefense[]
  onChange: (next: GapDefense[]) => void
}

/**
 * The weak spots in this candidate's fit, each with a prepared answer.
 *
 * Ticking one means "I have this answer ready", which is also what protects it
 * from the next regeneration (see `prepMerge`). The response text stays
 * editable, because the model's phrasing is a draft — the user has to be able
 * to say it in their own words.
 */
export function GapDefenseList({ items, onChange }: Props) {
  const patch = (i: number, p: Partial<GapDefense>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)))

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  if (!items.length) {
    return (
      <p className="text-aa-13 text-aa-text-secondary">
        Nothing flagged — run a match analysis on this application to get
        sharper gaps.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((item, i) => (
        <div
          key={i}
          className="group">
          <div className="flex items-start gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={!!item.checked}
              aria-label={`Answer ready: ${item.gap}`}
              onClick={() => patch(i, { checked: !item.checked })}
              className={`mt-0.5 w-4 h-4 shrink-0 grid place-items-center rounded-aa-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary ${
                item.checked
                  ? "bg-aa-primary border-aa-primary text-aa-text-on-primary"
                  : "border-aa-border hover:border-aa-neutral-400"
              }`}>
              {item.checked && <Check className="w-3 h-3" />}
            </button>
            <p className="flex-1 text-aa-13 font-semibold text-aa-text-primary leading-snug">
              {item.gap}
            </p>
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
          <textarea
            value={item.response}
            onChange={(e) => patch(i, { response: e.target.value })}
            rows={3}
            aria-label={`Your answer for: ${item.gap}`}
            className="mt-2 w-full px-3 py-2 bg-aa-surface border border-aa-border rounded-aa-md text-aa-13 text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors resize-y"
          />
        </div>
      ))}
    </div>
  )
}

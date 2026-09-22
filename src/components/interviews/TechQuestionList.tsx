import { BookOpen, Check, Star, X } from "lucide-react"

import type { TechQuestion } from "~types/userProfile"

interface Props {
  items: TechQuestion[]
  onChange: (next: TechQuestion[]) => void
  /** Open the "Learn more" lesson for the question at this index. */
  onLearnMore: (index: number) => void
}

/**
 * The Q&A drill for a technical round: questions this job's stack invites,
 * each with the answer the candidate should be able to give.
 *
 * The answer is a textarea rather than prose, for the same reason a gap
 * defense is — the model's wording is a draft, and the point of the drill is
 * saying it back in your own words. Rewriting one marks it `userAdded`, which
 * is what protects it from the next regeneration (see `prepMerge`).
 *
 * "Learn more" is for the question whose answer the candidate can read but
 * not yet reconstruct: the drill wants four sentences said back, and the
 * lesson behind that button is where the understanding to say them comes
 * from.
 */
export function TechQuestionList({ items, onChange, onLearnMore }: Props) {
  const patch = (i: number, p: Partial<TechQuestion>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)))

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  if (!items.length) {
    return (
      <p className="text-aa-13 text-aa-text-secondary">
        No questions yet — regenerate with a job description saved on this
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
              aria-label={`I can answer: ${item.question}`}
              onClick={() => patch(i, { checked: !item.checked })}
              className={`mt-0.5 w-4 h-4 shrink-0 grid place-items-center rounded-aa-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary ${
                item.checked
                  ? "bg-aa-primary border-aa-primary text-aa-text-on-primary"
                  : "border-aa-border hover:border-aa-neutral-400"
              }`}>
              {item.checked && <Check className="w-3 h-3" />}
            </button>
            <div className="flex-1 min-w-0">
              {item.topic && (
                <span className="inline-block mb-1 px-2 py-0.5 rounded-aa-pill bg-aa-neutral-100 text-aa-10 font-semibold text-aa-text-secondary">
                  {item.topic}
                </span>
              )}
              <p className="text-aa-13 font-semibold text-aa-text-primary leading-snug">
                {item.question}
              </p>
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
          <textarea
            value={item.answer}
            onChange={(e) =>
              patch(i, {
                answer: e.target.value,
                userAdded: e.target.value.trim().length > 0
              })
            }
            rows={4}
            aria-label={`Your answer to: ${item.question}`}
            className="mt-2 w-full px-3 py-2 bg-aa-surface border border-aa-border rounded-aa-md text-aa-13 text-aa-text-primary focus:outline-none focus:border-aa-primary transition-colors resize-y"
          />
          <button
            type="button"
            onClick={() => onLearnMore(i)}
            aria-label={`Learn more about: ${item.question}`}
            className="aa-btn-link mt-1 inline-flex items-center gap-aa-1 aa-no-print">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            {item.lesson ? "Open lesson" : "Learn more"}
          </button>
        </div>
      ))}
    </div>
  )
}

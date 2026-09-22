import { Check, Star, X } from "lucide-react"
import { Fragment } from "react"

import type { StarStory } from "~types/userProfile"

interface Props {
  items: StarStory[]
  onChange: (next: StarStory[]) => void
}

const PARTS = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" }
] as const

/**
 * Rehearsable stories, scaffolded from real achievements in the profile.
 *
 * Read-only prose rather than inputs: a story is something the user says out
 * loud, and the useful interaction is ticking it once they can. The `covers`
 * tags say which likely topics it answers, so they can see at a glance whether
 * a topic has a story behind it — which is why they sit on a labelled row of
 * the same definition list rather than loose under the block.
 *
 * What gets rehearsed is the answer, not the scaffold that produced it, so the
 * four parts are set as one column of prose with S/T/A/R as margin notes
 * beside it (`.aa-story-*`), and a ticked story fades back out of the way.
 */
export function StarStoryList({ items, onChange }: Props) {
  const patch = (i: number, p: Partial<StarStory>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)))

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  if (!items.length) {
    return (
      <p className="text-aa-13 text-aa-text-secondary">
        No stories yet — add achievements to your profile and regenerate, and
        they get built from those.
      </p>
    )
  }

  return (
    <ul>
      {items.map((story, i) => {
        const parts = PARTS.filter(({ key }) => story[key])
        const covers = story.covers ?? []
        return (
          <li
            key={i}
            className={`aa-story group${story.checked ? " aa-story-done" : ""}`}>
            <div className="flex items-start gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={!!story.checked}
                aria-label={`Rehearsed: ${story.title}`}
                onClick={() => patch(i, { checked: !story.checked })}
                className={`mt-0.5 w-4 h-4 shrink-0 grid place-items-center rounded-aa-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary ${
                  story.checked
                    ? "bg-aa-primary border-aa-primary text-aa-text-on-primary"
                    : "border-aa-border hover:border-aa-neutral-400"
                }`}>
                {story.checked && <Check className="w-3 h-3" />}
              </button>
              <h4 className="aa-story-title">{story.title}</h4>
              <button
                type="button"
                aria-label={story.pinned ? "Unpin" : "Pin"}
                onClick={() => patch(i, { pinned: !story.pinned })}
                className={`shrink-0 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary rounded-aa-sm ${
                  story.pinned
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                }`}>
                <Star
                  className={`w-3.5 h-3.5 ${
                    story.pinned ? "text-aa-primary" : "text-aa-neutral-400"
                  }`}
                  fill={story.pinned ? "currentColor" : "none"}
                />
              </button>
              {story.userAdded && (
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => remove(i)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-aa-neutral-400 hover:text-aa-error-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary rounded-aa-sm">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(parts.length > 0 || covers.length > 0) && (
              <dl className="aa-story-body">
                {parts.map(({ key, label }) => (
                  <Fragment key={key}>
                    <dt className="aa-story-label">{label}</dt>
                    <dd className="aa-story-text">{story[key]}</dd>
                  </Fragment>
                ))}
                {covers.length > 0 && (
                  <>
                    <dt className="aa-story-label">Covers</dt>
                    <dd className="flex flex-wrap gap-aa-1">
                      {covers.map((topic) => (
                        <span key={topic} className="aa-topic-chip">
                          {topic}
                        </span>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            )}
          </li>
        )
      })}
    </ul>
  )
}

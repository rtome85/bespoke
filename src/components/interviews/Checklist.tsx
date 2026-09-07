import { Check, Plus, Star, X } from "lucide-react"
import { useState } from "react"

import type { PrepItem } from "~types/userProfile"

interface Props {
  items: PrepItem[]
  onChange: (next: PrepItem[]) => void
  addLabel?: string
}

/** Editable checklist over `PrepItem[]` — toggle, pin, add, remove user items. */
export function Checklist({ items, onChange, addLabel = "Add item" }: Props) {
  const [draft, setDraft] = useState("")

  const patch = (i: number, p: Partial<PrepItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)))

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  const add = () => {
    const text = draft.trim()
    if (!text) return
    onChange([...items, { text, userAdded: true }])
    setDraft("")
  }

  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <button
            type="button"
            role="checkbox"
            aria-checked={!!it.checked}
            onClick={() => patch(i, { checked: !it.checked })}
            className={`mt-[2px] w-4 h-4 shrink-0 grid place-items-center rounded-aa-sm border transition-colors ${
              it.checked
                ? "bg-aa-primary border-aa-primary text-aa-text-on-primary"
                : "border-aa-border hover:border-aa-neutral-400"
            }`}>
            {it.checked && <Check className="w-3 h-3" />}
          </button>
          <span
            className={`flex-1 text-[13px] leading-snug ${
              it.checked
                ? "text-aa-text-secondary line-through"
                : "text-aa-text-primary"
            }`}>
            {it.text}
          </span>
          <button
            type="button"
            aria-label={it.pinned ? "Unpin" : "Pin"}
            onClick={() => patch(i, { pinned: !it.pinned })}
            className={`shrink-0 transition-opacity ${
              it.pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}>
            <Star
              className={`w-3.5 h-3.5 ${
                it.pinned ? "text-aa-primary" : "text-aa-neutral-400"
              }`}
              fill={it.pinned ? "currentColor" : "none"}
            />
          </button>
          {it.userAdded && (
            <button
              type="button"
              aria-label="Remove"
              onClick={() => remove(i)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-aa-neutral-400 hover:text-aa-error-strong">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Plus className="w-3.5 h-3.5 text-aa-neutral-400 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={addLabel}
          className="flex-1 bg-transparent text-[13px] text-aa-text-primary placeholder:text-aa-neutral-400 focus:outline-none py-1"
        />
      </div>
    </div>
  )
}

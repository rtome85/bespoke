import type { Dispatch, SetStateAction } from "react"

import { PRESET_TAGS } from "~constants/dialog"
import type { SaveApplicationFormData } from "~types/dialog"

interface Props {
  formData: SaveApplicationFormData
  setFormData: Dispatch<SetStateAction<SaveApplicationFormData>>
}

export function ApplicationTagsField({ formData, setFormData }: Props) {
  return (
    <div>
      <label className={`aa-field-label mb-2`}>Tags</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESET_TAGS.map((tag) => {
          const active = formData.tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setFormData((current) => ({
                  ...current,
                  tags: active
                    ? current.tags.filter((currentTag) => currentTag !== tag)
                    : [...current.tags, tag]
                }))
              }
              className={`px-3 py-1 rounded-aa-pill text-aa-11 font-semibold border transition-colors ${
                active
                  ? "bg-aa-primary text-aa-text-on-primary border-aa-primary"
                  : "border-aa-border text-aa-text-secondary hover:text-aa-text-primary hover:border-aa-neutral-400"
              }`}>
              {tag}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {formData.tags
          .filter((tag) => !PRESET_TAGS.includes(tag))
          .map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2.5 py-1 rounded-aa-pill text-aa-11 text-aa-text-secondary border border-aa-border">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag} tag`}
                onClick={() =>
                  setFormData((current) => ({
                    ...current,
                    tags: current.tags.filter(
                      (currentTag) => currentTag !== tag
                    )
                  }))
                }
                className="hover:text-aa-text-primary transition-colors leading-none">
                ×
              </button>
            </span>
          ))}
      </div>

      <input
        type="text"
        placeholder="Add custom tag, press Enter"
        className="aa-field-input"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            const value = event.currentTarget.value.trim()
            if (value && !formData.tags.includes(value)) {
              setFormData((current) => ({
                ...current,
                tags: [...current.tags, value]
              }))
            }
            event.currentTarget.value = ""
          }
        }}
      />
    </div>
  )
}

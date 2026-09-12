import type { PromptTemplate } from "~types/config"

interface Props {
  template: PromptTemplate
  isActive: boolean
  onApply: () => void
}

export function PromptTemplateCard({ template, isActive, onApply }: Props) {
  return (
    <div
      className={`flex flex-col rounded-aa-md border p-4 transition-colors ${
        isActive
          ? "border-aa-primary bg-aa-primary-soft"
          : "border-aa-border bg-aa-surface hover:border-aa-neutral-400"
      }`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-aa-text-primary text-[13px]">
          {template.name}
        </h3>
        {isActive && (
          <span className="text-[10px] font-bold uppercase tracking-wider rounded-aa-pill bg-aa-success-soft text-aa-success-strong px-2 py-0.5 shrink-0 ml-2">
            Active
          </span>
        )}
      </div>
      <p className="text-xs text-aa-text-secondary mb-3">{template.tagLine}</p>
      <ul className="space-y-1.5 flex-1 mb-4">
        {template.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2 text-xs text-aa-text-secondary">
            <span className="text-aa-primary mt-0.5 shrink-0">•</span>
            {bullet}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onApply}
        disabled={isActive}
        className={`w-full py-2 rounded-aa-md text-[12px] font-semibold transition-colors ${
          isActive
            ? "bg-aa-neutral-100 text-aa-text-secondary cursor-default"
            : "bg-aa-primary text-aa-text-on-primary hover:bg-aa-primary-hover"
        }`}>
        {isActive ? "Applied" : "Apply preset"}
      </button>
    </div>
  )
}

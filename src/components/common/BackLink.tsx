import { ChevronLeft } from "lucide-react"

/**
 * `‹ Label` back affordance for the sub-topbar of the full-page workspaces
 * (Prep round, Debrief round).
 */
export function BackLink({
  label,
  onClick
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[13px] font-semibold text-aa-text-secondary hover:text-aa-text-primary transition-colors cursor-pointer">
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  )
}

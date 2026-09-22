import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp
} from "lucide-react"

import type { MatchAccordionSection } from "~types/dialog"
import type { MatchResult } from "~types/match"

interface Props {
  match: MatchResult
  openSection: MatchAccordionSection | null
  onToggle: (section: MatchAccordionSection) => void
}

export function MatchBreakdown({ match, openSection, onToggle }: Props) {
  const rows = [
    {
      key: "strengths",
      label: "Strengths",
      color: "var(--aa-success-strong)",
      Icon: CheckCircle2,
      marker: "✓",
      items: match.strengths ?? []
    },
    {
      key: "weaknesses",
      label: "Weaknesses",
      color: "var(--aa-error-strong)",
      Icon: AlertTriangle,
      marker: "×",
      items: match.weaknesses ?? []
    },
    {
      key: "improvements",
      label: "Improvements",
      color: "var(--aa-secondary)",
      Icon: TrendingUp,
      marker: "→",
      items: match.improvements ?? []
    }
  ] as const

  const visibleRows = rows.filter((row) => row.items.length > 0)
  if (visibleRows.length === 0) return null

  return (
    <div className="flex flex-col gap-aa-5">
      {visibleRows.map((row) => {
        const open = openSection === row.key
        return (
          <div key={row.key} className="flex flex-col gap-aa-3">
            <button
              onClick={() => onToggle(row.key)}
              className="w-full flex items-center gap-aa-2 text-left">
              <row.Icon
                className="w-4 h-4 shrink-0"
                style={{ color: row.color }}
              />
              <span className="flex-1 font-aa-heading text-aa-15 font-semibold text-aa-text-primary">
                {row.label}
              </span>
              <span className="text-aa-13 font-semibold text-aa-text-secondary tabular-nums">
                {row.items.length}
              </span>
              <ChevronRight
                className="w-4 h-4 text-aa-text-secondary shrink-0 transition-transform duration-200"
                style={{
                  transform: open ? "rotate(90deg)" : "rotate(0deg)"
                }}
              />
            </button>
            {open && (
              <ul className="flex flex-col gap-2.5 pl-aa-6">
                {row.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex gap-aa-2 text-aa-sm leading-aa-1.45 text-aa-neutral-700">
                    <span
                      className="shrink-0 font-semibold"
                      style={{ color: row.color }}>
                      {row.marker}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp
} from "lucide-react"

import type { MatchAccordionSection, MatchResult } from "~types/dialog"

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
    <div className="bg-aa-surface rounded-aa-lg border border-aa-border overflow-hidden flex flex-col">
      {visibleRows.map((row, index) => {
        const open = openSection === row.key
        return (
          <div
            key={row.key}
            className={index > 0 ? "border-t border-aa-border" : ""}>
            <button
              onClick={() => onToggle(row.key)}
              className="w-full flex items-center gap-aa-3 px-aa-4 py-aa-4 text-left">
              <ChevronRight
                className="w-[18px] h-[18px] text-aa-neutral-500 shrink-0 transition-transform duration-200"
                style={{
                  transform: open ? "rotate(90deg)" : "rotate(0deg)"
                }}
              />
              <row.Icon
                className="w-4 h-4 shrink-0"
                style={{ color: row.color }}
              />
              <span className="flex-1 text-[15px] font-semibold text-aa-text-primary">
                {row.label}
              </span>
              <span className="text-[13px] font-semibold text-aa-text-secondary tabular-nums">
                {row.items.length}
              </span>
            </button>
            {open && (
              <ul className="flex flex-col gap-aa-3 px-aa-4 pb-aa-4 pl-[46px]">
                {row.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex gap-aa-2 text-[14px] leading-[1.45] text-aa-neutral-700">
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

import type { ScorePresentation } from "~lib/dialog/scorePresentation"

interface Props {
  percentage: number
  summary: string
  presentation: ScorePresentation
}

export function ScoreSummaryCard({ percentage, summary, presentation }: Props) {
  return (
    <div className="flex flex-col gap-aa-4">
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-aa-px-1">
          <span
            className="text-aa-56 font-bold leading-none tracking-aa-tighter-15"
            style={{ color: presentation.ink }}>
            {percentage}
          </span>
          <span className="text-aa-22 font-bold leading-aa-1.35 text-aa-text-secondary">
            %
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-aa-pill border px-2.5 py-aa-px-5 text-aa-caption font-semibold"
          style={{ color: presentation.ink, borderColor: presentation.ink }}>
          {presentation.band}
        </span>
      </div>

      <div className="flex gap-aa-px-3">
        {Array.from({ length: 20 }).map((_, index) => (
          <div
            key={index}
            className="flex-1 h-2.5 rounded-aa-2xs transition-colors duration-500"
            style={{
              backgroundColor:
                index < Math.round(percentage / 5)
                  ? presentation.fill
                  : "var(--aa-neutral-200)"
            }}
          />
        ))}
      </div>

      {summary && (
        <p className="text-aa-sm leading-aa-1.55 text-aa-neutral-700">
          {summary}
        </p>
      )}
    </div>
  )
}

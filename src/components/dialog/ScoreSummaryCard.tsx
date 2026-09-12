import type { ScorePresentation } from "~lib/dialog/scorePresentation"

interface Props {
  percentage: number
  summary: string
  presentation: ScorePresentation
}

export function ScoreSummaryCard({ percentage, summary, presentation }: Props) {
  return (
    <div className="bg-aa-surface-subtle rounded-aa-lg p-aa-6 flex flex-col gap-aa-4">
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-[1px]">
          <span
            className="text-[56px] font-bold leading-none tracking-[-1.5px]"
            style={{ color: presentation.ink }}>
            {percentage}
          </span>
          <span className="text-[22px] font-bold leading-[1.35] text-aa-text-secondary">
            %
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-aa-pill border px-[10px] py-[5px] text-[12px] font-semibold"
          style={{ color: presentation.ink, borderColor: presentation.ink }}>
          {presentation.band}
        </span>
      </div>

      <div className="flex flex-col gap-aa-2">
        <div className="flex gap-[3px]">
          {Array.from({ length: 20 }).map((_, index) => (
            <div
              key={index}
              className="flex-1 h-[10px] rounded-[2px] transition-colors duration-500"
              style={{
                backgroundColor:
                  index < Math.round(percentage / 5)
                    ? presentation.fill
                    : "var(--aa-neutral-200)"
              }}
            />
          ))}
        </div>
      </div>

      {summary && (
        <p className="text-[14px] leading-[1.55] text-aa-neutral-700">
          {summary}
        </p>
      )}
    </div>
  )
}

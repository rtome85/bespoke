/**
 * Compact score gauge shown in the match-report header once Apply collapses
 * the full score card — a proportional SVG ring (real stroke-dashoffset
 * math, not a flat colored circle) so the fill genuinely reflects the
 * percentage.
 */
export function ScoreGauge({
  percentage,
  ringColor,
  textColor
}: {
  percentage: number
  ringColor: string
  textColor: string
}) {
  const size = 60
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset =
    circumference * (1 - Math.min(100, Math.max(0, percentage)) / 100)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--aa-neutral-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[13px] font-bold leading-none"
          style={{ color: textColor }}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}

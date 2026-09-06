/**
 * A discrete N-stop spectrum control — track, fill, stop dots, knob and
 * end labels. Interaction + keyboard a11y come from a transparent native
 * range input laid over the visual.
 */
export function Spectrum({
  stops,
  value,
  onChange
}: {
  stops: string[]
  value: number
  onChange: (index: number) => void
}) {
  const max = Math.max(stops.length - 1, 1)
  const frac = value / max

  return (
    <div className="w-[460px] max-w-full flex flex-col gap-3">
      <div className="relative h-5">
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 rounded-aa-pill bg-aa-neutral-200" />
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 h-1 rounded-aa-pill bg-aa-primary"
          style={{ width: `calc((100% - 16px) * ${frac})` }}
        />
        {stops.map((_, i) => (
          <span
            key={i}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
              i <= value ? "bg-aa-primary" : "bg-aa-neutral-300"
            }`}
            style={{ left: `calc(8px + (100% - 16px) * ${i / max})` }}
          />
        ))}
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full bg-aa-surface border-[3px] border-aa-primary"
          style={{ left: `calc(8px + (100% - 16px) * ${frac})` }}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-label={stops[value]}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between">
        {stops.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(i)}
            className={`text-[11px] bg-transparent border-0 p-0 cursor-pointer ${
              i === value
                ? "text-aa-primary font-bold"
                : "text-aa-text-secondary font-normal"
            }`}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

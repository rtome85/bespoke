interface Props {
  title: string
  subtitle: string
  progress: number
  quote: {
    text: string
    author: string
  }
  quoteVisible: boolean
}

export function AnalysisSplash({
  title,
  subtitle,
  progress,
  quote,
  quoteVisible
}: Props) {
  return (
    <div className="min-h-screen bg-aa-surface-subtle flex items-center justify-center p-aa-6 font-aa text-aa-text-primary">
      <div className="w-full max-w-[380px] bg-aa-surface border border-aa-border rounded-aa-xl px-aa-8 py-aa-10 flex flex-col items-center gap-aa-6 text-center">
        <div className="flex flex-col items-center gap-aa-2">
          <h1 className="text-[22px] font-bold tracking-[-0.3px] leading-[1.25]">
            {title}
          </h1>
          <p className="text-[14px] text-aa-text-secondary">{subtitle}</p>
        </div>

        <div className="w-full bg-aa-neutral-200 h-[10px] rounded-aa-pill overflow-hidden">
          <div
            className="h-full bg-aa-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          className="transition-opacity duration-500 ease-out"
          style={{ opacity: quoteVisible ? 1 : 0 }}>
          <p className="text-[14px] italic leading-[1.6] text-aa-neutral-600">
            "{quote.text}"
          </p>
          <p className="mt-aa-2 text-[12px] text-aa-neutral-500">
            — {quote.author}
          </p>
        </div>
      </div>
    </div>
  )
}

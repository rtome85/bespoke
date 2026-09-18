import { useEffect, useState } from "react"

import type { SectionCount } from "~hooks/interviews/usePrepWorkspace"

export interface RailEntry {
  id: string
  label: string
  /** Omitted for sections that have nothing to tick (research, notes, prose). */
  count?: SectionCount
}

/**
 * Which section is under the reader right now.
 *
 * The sheet runs several viewport heights, and the question it has to answer
 * cheaply is "have I done my gaps?". Highlighting the section in view is what
 * makes the counts beside it mean something.
 */
function useActiveSection(ids: string[]): string | undefined {
  const key = ids.join("|")
  const [active, setActive] = useState<string | undefined>(ids[0])

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)
    if (!elements.length) return

    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio)
        }
        let best: string | undefined
        let bestRatio = 0
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        }
        if (best) setActive(best)
      },
      // Bias towards the top of the viewport so the highlighted entry is the
      // one being read, not the one that happens to be tallest.
      { rootMargin: "0px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    )
    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
    // `key` stands in for the id list so the observer is rebuilt only when the
    // set of rendered sections actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return active
}

export function PrepSectionRail({ entries }: { entries: RailEntry[] }) {
  const active = useActiveSection(entries.map((e) => e.id))

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    // Scrolling alone doesn't move focus, which would strand a keyboard user
    // at the rail. `tabIndex={-1}` on the sections makes this land.
    el.focus({ preventScroll: true })
  }

  return (
    // The outer column is the grid item and stretches to the full height of
    // the sheet; the nav inside it is what sticks. Sticking the grid item
    // itself does nothing — it is only as tall as its own content, so there is
    // no track for it to travel along.
    <div className="aa-runsheet-railcol aa-no-print">
      <nav className="aa-runsheet-rail" aria-label="Sections">
        <span className="aa-runsheet-rail-label">On this sheet</span>
        {entries.map((entry) => {
          const on = entry.id === active
          const complete = entry.count && entry.count.done === entry.count.total
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => jump(entry.id)}
              aria-current={on ? "true" : undefined}
              className={`aa-runsheet-link ${on ? "aa-runsheet-link-on" : ""}`}>
              <span>{entry.label}</span>
              {entry.count && entry.count.total > 0 && (
                <span
                  className={`aa-runsheet-count ${
                    complete ? "text-aa-success-strong" : "text-aa-neutral-500"
                  }`}>
                  {entry.count.done}/{entry.count.total}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

import { Briefcase, Settings as SettingsIcon } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"

import type { AppSection, SettingsNavGroup } from "~types/options"

const SECTION_TABS: { id: AppSection; label: string; icon: typeof Briefcase }[] =
  [
    { id: "applications", label: "Applications", icon: Briefcase },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ]

/**
 * Second-level nav for the Settings section — a dark grouped rail that
 * sits under the AppBar. The brand lockup lives in the AppBar, not here.
 * Carries the Applications / Settings section switch at the top.
 */
export function SettingsRail({
  groups,
  active,
  onSelect,
  section,
  onSection,
  email
}: {
  groups: SettingsNavGroup[]
  active: string
  onSelect: (value: string) => void
  section: AppSection
  onSection: (s: AppSection) => void
  email?: string
}) {
  const sectionButtonRefs = useRef<Partial<Record<AppSection, HTMLButtonElement>>>(
    {}
  )
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(
    null
  )

  useLayoutEffect(() => {
    const measure = () => {
      const btn = sectionButtonRefs.current[section]
      if (!btn) return
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [section])

  return (
    <aside className="w-14 lg:w-60 shrink-0 bg-aa-neutral-900 sticky top-aa-appbar h-aa-below-appbar overflow-y-auto py-5 px-2 lg:px-4 flex flex-col gap-4 lg:gap-6">
      <div
        aria-label="Section"
        className="relative flex items-center justify-center gap-aa-px-3 p-aa-px-3 rounded-aa-pill bg-aa-neutral-800 mb-4 lg:mb-6">
        {indicator ? (
          <div
            aria-hidden="true"
            className="absolute top-aa-px-3 bottom-aa-px-3 rounded-aa-pill bg-aa-primary transition-all duration-200 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        ) : null}
        {SECTION_TABS.map((t) => {
          const on = section === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              ref={(el) => {
                if (el) sectionButtonRefs.current[t.id] = el
              }}
              onClick={() => onSection(t.id)}
              title={t.label}
              className={`relative z-10 flex items-center justify-center gap-2 px-3 py-aa-px-7 rounded-aa-pill border-0 cursor-pointer ${
                on ? "" : "hover:bg-aa-neutral-700"
              }`}>
              <Icon
                size={14}
                className={`lg:hidden shrink-0 transition-colors ${on ? "text-aa-text-on-primary" : "text-aa-neutral-400"}`}
              />
              <span
                className={`hidden lg:inline whitespace-nowrap text-aa-caption font-semibold transition-colors ${
                  on ? "text-aa-text-on-primary" : "text-aa-neutral-400"
                }`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <div className="hidden lg:block text-aa-10 font-bold tracking-aa-wider-10 text-aa-neutral-400 uppercase px-2.5 pb-1.5">
            {group.label}
          </div>
          {group.items.map((item) => {
            const on = active === item.value
            const Icon = item.icon
            return (
              <button
                key={item.value}
                onClick={() => onSelect(item.value)}
                title={item.label}
                className={`w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-2.5 py-2 rounded-aa-md text-left border-0 cursor-pointer transition-colors ${
                  on
                    ? "bg-aa-neutral-800"
                    : "bg-transparent hover:bg-aa-neutral-800"
                }`}>
                <Icon
                  size={16}
                  className={`shrink-0 ${on ? "text-aa-primary" : "text-aa-neutral-500"}`}
                />
                <span
                  className={`hidden lg:inline text-aa-13 ${
                    on
                      ? "text-aa-surface font-semibold"
                      : "text-aa-neutral-400 font-medium"
                  }`}>
                  {item.label}
                </span>
                {item.badge != null && item.badge !== "" && (
                  <span
                    className={`hidden lg:inline ml-auto text-aa-11 font-semibold tabular-nums ${
                      on ? "text-aa-neutral-300" : "text-aa-neutral-500"
                    }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}

      {email ? (
        <div className="mt-auto flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-2.5 pt-4 border-t border-aa-neutral-800 min-w-0">
          <div className="w-aa-px-26 h-aa-px-26 shrink-0 rounded-aa-pill bg-aa-neutral-700 flex items-center justify-center text-aa-11 font-bold text-aa-surface">
            {email[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="hidden lg:inline text-aa-caption text-aa-neutral-400 truncate">
            {email}
          </span>
        </div>
      ) : null}
    </aside>
  )
}

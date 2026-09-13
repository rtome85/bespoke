import { Briefcase, Settings as SettingsIcon } from "lucide-react"

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
  return (
    <aside className="w-14 lg:w-60 shrink-0 bg-aa-neutral-900 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto py-5 px-2 lg:px-4 flex flex-col gap-4 lg:gap-6">
      <div
        role="tablist"
        aria-label="Section"
        className="flex items-center gap-[3px] p-[3px] rounded-aa-pill bg-aa-neutral-800 mb-4 lg:mb-6">
        {SECTION_TABS.map((t) => {
          const on = section === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => onSection(t.id)}
              title={t.label}
              className={`flex-1 flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-8 py-[7px] rounded-aa-pill border-0 cursor-pointer transition-colors ${
                on
                  ? "bg-aa-primary"
                  : "bg-transparent hover:bg-aa-neutral-700"
              }`}>
              <Icon
                size={14}
                className={`shrink-0 ${on ? "text-aa-text-on-primary" : "text-aa-neutral-400"}`}
              />
              <span
                className={`hidden lg:inline text-[12px] font-semibold ${
                  on ? "text-aa-text-on-primary" : "text-aa-neutral-400"
                }`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-[2px]">
          <div className="hidden lg:block text-[10px] font-bold tracking-[0.1em] text-aa-neutral-400 uppercase px-[10px] pb-[6px]">
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
                className={`w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-[10px] py-2 rounded-aa-md text-left border-0 cursor-pointer transition-colors ${
                  on
                    ? "bg-aa-neutral-800"
                    : "bg-transparent hover:bg-aa-neutral-800"
                }`}>
                <Icon
                  size={16}
                  className={`shrink-0 ${on ? "text-aa-primary" : "text-aa-neutral-500"}`}
                />
                <span
                  className={`hidden lg:inline text-[13px] ${
                    on
                      ? "text-aa-surface font-semibold"
                      : "text-aa-neutral-400 font-medium"
                  }`}>
                  {item.label}
                </span>
                {item.badge != null && item.badge !== "" && (
                  <span
                    className={`hidden lg:inline ml-auto text-[11px] font-semibold tabular-nums ${
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
        <div className="mt-auto flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-[10px] pt-4 border-t border-aa-neutral-800 min-w-0">
          <div className="w-[26px] h-[26px] shrink-0 rounded-aa-pill bg-aa-neutral-700 flex items-center justify-center text-[11px] font-bold text-aa-surface">
            {email[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="hidden lg:inline text-[12px] text-aa-neutral-400 truncate">
            {email}
          </span>
        </div>
      ) : null}
    </aside>
  )
}

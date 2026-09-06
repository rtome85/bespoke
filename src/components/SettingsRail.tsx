import type { LucideIcon } from "lucide-react"

export type SettingsNavItem = {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
}

export type SettingsNavGroup = {
  label: string
  items: SettingsNavItem[]
}

/**
 * Second-level nav for the Settings section — a dark grouped rail that
 * sits under the AppBar. The brand lockup lives in the AppBar, not here.
 */
export function SettingsRail({
  groups,
  active,
  onSelect
}: {
  groups: SettingsNavGroup[]
  active: string
  onSelect: (value: string) => void
}) {
  return (
    <aside className="w-60 shrink-0 bg-aa-neutral-900 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto py-5 px-4 flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-[2px]">
          <div className="text-[10px] font-bold tracking-[0.1em] text-aa-neutral-400 uppercase px-[10px] pb-[6px]">
            {group.label}
          </div>
          {group.items.map((item) => {
            const on = active === item.value
            const Icon = item.icon
            return (
              <button
                key={item.value}
                onClick={() => onSelect(item.value)}
                className={`w-full flex items-center gap-3 px-[10px] py-2 rounded-aa-md text-left border-0 cursor-pointer transition-colors ${
                  on ? "bg-aa-neutral-800" : "bg-transparent hover:bg-aa-neutral-800"
                }`}>
                <Icon
                  size={16}
                  className={on ? "text-aa-primary" : "text-aa-neutral-500"}
                />
                <span
                  className={`text-[13px] ${
                    on
                      ? "text-aa-surface font-semibold"
                      : "text-aa-neutral-400 font-medium"
                  }`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}

import type { ReactNode } from "react"

import { SettingsRail } from "~components/options/SettingsRail"
import { NAV_GROUPS } from "~constants/options"
import type { AppSection, SettingsNavItem } from "~types/options"

interface Props {
  activeTab: string
  activeNav?: SettingsNavItem
  children: ReactNode
  onSelect: (value: string) => void
  section: AppSection
  onSection: (s: AppSection) => void
  email?: string
}

export function SettingsArea({
  activeTab,
  activeNav,
  children,
  onSelect,
  section,
  onSection,
  email
}: Props) {
  return (
    <div className="flex flex-1">
      <SettingsRail
        groups={NAV_GROUPS}
        active={activeTab}
        onSelect={onSelect}
        section={section}
        onSection={onSection}
        email={email}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 shrink-0 bg-aa-surface border-b border-aa-border px-8 flex items-center gap-4">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-[18px] font-semibold text-aa-text-primary shrink-0">
              {activeNav?.label ?? ""}
            </h1>
            <p className="text-[13px] text-aa-text-secondary truncate">
              {activeNav?.subtitle ?? ""}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">{children}</div>
      </div>
    </div>
  )
}

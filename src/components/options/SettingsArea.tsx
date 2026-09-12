import type { ReactNode } from "react"

import { SettingsRail } from "~components/SettingsRail"
import { ACCENT_BUTTON_CLASS, NAV_GROUPS } from "~constants/options"
import type { SettingsNavItem } from "~types/options"

interface Props {
  activeTab: string
  activeNav?: SettingsNavItem
  saveStatus: string
  children: ReactNode
  onSelect: (value: string) => void
  onSave: () => void
}

export function SettingsArea({
  activeTab,
  activeNav,
  saveStatus,
  children,
  onSelect,
  onSave
}: Props) {
  return (
    <div className="flex flex-1">
      <SettingsRail
        groups={NAV_GROUPS}
        active={activeTab}
        onSelect={onSelect}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 shrink-0 bg-aa-surface border-b border-aa-border px-8 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-[18px] font-semibold text-aa-text-primary shrink-0">
              {activeNav?.label ?? ""}
            </h1>
            <p className="text-[13px] text-aa-text-secondary truncate">
              {activeNav?.subtitle ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saveStatus ? (
              <span className="text-[12px] font-semibold text-aa-success-strong">
                {saveStatus}
              </span>
            ) : (
              <span className="text-[12px] text-aa-neutral-500">
                All changes saved
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              className={ACCENT_BUTTON_CLASS}>
              Save changes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">{children}</div>
      </div>
    </div>
  )
}

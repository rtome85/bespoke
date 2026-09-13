import { Triangle } from "lucide-react"

import { ACCENT_BUTTON_CLASS } from "~constants/options"

/**
 * Persistent top-level nav for the app tab. Dark bar carrying the brand
 * and the save-changes CTA. The Applications / Settings switch lives in
 * the sidebar rail.
 */
export function AppBar({
  saveStatus,
  onSave
}: {
  saveStatus?: string
  onSave?: () => void
}) {
  const version = chrome.runtime.getManifest().version

  return (
    <header className="sticky top-0 z-30 h-[52px] shrink-0 bg-aa-neutral-900 flex items-center gap-4 sm:gap-8 px-4 sm:px-5">
      <div className="flex items-center gap-2">
        <div className="w-[22px] h-[22px] rounded-aa-sm bg-aa-primary flex items-center justify-center">
          <Triangle size={11} className="text-aa-text-on-primary" fill="currentColor" />
        </div>
        <span className="text-[14px] font-bold text-aa-surface">Bespoke</span>
        <span className="hidden sm:inline text-[11px] text-aa-neutral-500">
          v{version}
        </span>
      </div>

      <div className="flex-1" />

      {onSave ? (
        <div className="flex items-center gap-3 shrink-0">
          {saveStatus ? (
            <span className="text-[12px] font-semibold text-aa-success">
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
      ) : null}
    </header>
  )
}

import { Triangle } from "lucide-react"

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
    <header className="sticky top-0 z-30 h-aa-appbar shrink-0 bg-aa-neutral-900 flex items-center gap-4 sm:gap-8 px-4 sm:px-5">
      <div className="flex items-center gap-2">
        <div className="w-aa-px-22 h-aa-px-22 rounded-aa-sm bg-aa-primary flex items-center justify-center">
          <Triangle size={11} className="text-aa-text-on-primary" fill="currentColor" />
        </div>
        <span className="text-aa-sm font-bold text-aa-surface">Bespoke</span>
        <span className="hidden sm:inline text-aa-11 text-aa-neutral-500">
          v{version}
        </span>
      </div>

      <div className="flex-1" />

      {onSave ? (
        <div className="flex items-center gap-3 shrink-0">
          {saveStatus ? (
            <span className="text-aa-caption font-semibold text-aa-success">
              {saveStatus}
            </span>
          ) : (
            <span className="text-aa-caption text-aa-neutral-500">
              All changes saved
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            className="aa-btn-accent">
            Save changes
          </button>
        </div>
      ) : null}
    </header>
  )
}

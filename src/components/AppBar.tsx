import { Triangle } from "lucide-react"

export type AppSection = "applications" | "settings"

const TABS: { id: AppSection; label: string }[] = [
  { id: "applications", label: "Applications" },
  { id: "settings", label: "Settings" }
]

/**
 * Persistent top-level nav for the app tab. Dark bar carrying the brand,
 * the Applications / Settings switch, and the account chip.
 */
export function AppBar({
  section,
  onSection,
  email
}: {
  section: AppSection
  onSection: (s: AppSection) => void
  email?: string
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

      <nav className="flex items-stretch gap-4 h-full">
        {TABS.map((t) => {
          const on = section === t.id
          return (
            <button
              key={t.id}
              onClick={() => onSection(t.id)}
              className="h-full flex flex-col items-center justify-center gap-[7px] border-0 bg-transparent cursor-pointer">
              <span
                className={`text-[13px] font-semibold ${
                  on ? "text-aa-surface" : "text-aa-neutral-400"
                }`}>
                {t.label}
              </span>
              <span
                className={`w-full h-[2px] ${
                  on ? "bg-aa-primary" : "bg-transparent"
                }`}
              />
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {email ? (
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden md:inline text-[12px] text-aa-neutral-400 truncate max-w-[200px]">
            {email}
          </span>
          <div className="w-[26px] h-[26px] shrink-0 rounded-aa-pill bg-aa-neutral-700 flex items-center justify-center text-[11px] font-bold text-aa-surface">
            {email[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
      ) : null}
    </header>
  )
}

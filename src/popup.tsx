import { Briefcase, ChevronRight, Settings2 } from "lucide-react"

import icon from "../assets/icon.png"

import "./style.css"

/**
 * Toolbar popup — a thin launcher into the app shell. Running a match
 * happens from the right-click context menu (see background/context-menu.ts).
 */
function IndexPopup() {
  const openShell = (params = "") => {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html" + params) })
    window.close()
  }

  return (
    <div className="w-80 bg-aa-surface font-aa text-aa-text-primary">
      <div className="bg-aa-neutral-900 px-5 py-4 flex items-center gap-3">
        <img
          src={icon}
          alt=""
          className="w-9 h-9 rounded-aa-sm shrink-0"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-bold text-aa-surface leading-tight">
            Bespoke
          </span>
          <span className="text-[11px] text-aa-neutral-400 leading-tight">
            Tailor your CV to every job
          </span>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => openShell()}
          className="w-full px-4 py-2.5 bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold hover:bg-aa-primary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary focus-visible:ring-offset-2">
          Open Bespoke
        </button>

        <div className="mt-2 -mx-1">
          {[
            {
              label: "Applications",
              icon: Briefcase,
              onClick: () => openShell("?section=applications")
            },
            {
              label: "Settings & profile",
              icon: Settings2,
              onClick: () => openShell("?section=settings")
            }
          ].map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-aa-md hover:bg-aa-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aa-primary focus-visible:ring-inset">
              <span className="flex items-center gap-2.5">
                <Icon className="w-[17px] h-[17px] text-aa-text-secondary" />
                <span className="text-[13px] font-medium text-aa-text-primary">
                  {label}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-aa-neutral-400" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-aa-neutral-50 border-t border-aa-border px-5 py-3">
        <p className="text-[11px] text-aa-text-secondary leading-relaxed">
          Tip: right-click any job posting →{" "}
          <span className="font-semibold text-aa-text-primary">
            Check my match for this job
          </span>
        </p>
      </div>
    </div>
  )
}

export default IndexPopup

import { useState } from "react"
import { BarChart3, Briefcase, ChevronRight, Loader2, Settings2 } from "lucide-react"

import "./style.css"

function IndexPopup() {
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setStatus("Scraping job data...")

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs || tabs.length === 0) {
        setStatus("No active tab found")
        setLoading(false)
        return
      }

      const tab = tabs[0]

      if (
        !tab.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://")
      ) {
        setStatus("Cannot access this page")
        setLoading(false)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSource"
      })

      if (!response?.data) {
        setStatus("No job description found on this page")
        setLoading(false)
        return
      }

      chrome.storage.local.set({
        pendingJobData: {
          selectedText: response.data,
          tabUrl: tab.url,
          tabId: tab.id,
          companyName: response.companyName || "",
          jobTitle: response.jobTitle || ""
        }
      })

      chrome.windows.create({
        url: chrome.runtime.getURL("tabs/dialog.html"),
        type: "popup",
        width: 500,
        height: 440,
        focused: true
      })

      window.close()
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Error scraping job data"
      )
      setLoading(false)
    }
  }

  const openAnalytics = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/analytics.html"),
      type: "popup",
      width: 900,
      height: 600,
      focused: true
    })
    window.close()
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const openApplications = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/dialog.html") + "?view=applicationsList",
      type: "popup",
      width: 700,
      height: 520,
      focused: true
    })
    window.close()
  }

  return (
    <div className="w-80 bg-canvas border-2 border-sidebar font-body">
      {/* Header */}
      <div className="bg-sidebar px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-sidebar-accent rounded flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-[15px] font-bold text-canvas leading-tight">
            JobTailor
          </h1>
          <p className="font-body text-[11px] text-[#9B9490] leading-tight">
            Tailor your CV to every job
          </p>
        </div>
      </div>

      {/* Menu rows */}
      <div className="bg-surface divide-y divide-canvas-divide">
        <button
          onClick={openApplications}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-canvas transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-inset">
          <span className="flex items-center gap-3">
            <Briefcase className="w-[18px] h-[18px] text-sidebar-label" />
            <span className="font-heading text-[13px] font-semibold text-ink">
              My Applications
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </button>
        <button
          onClick={openAnalytics}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-canvas transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-inset">
          <span className="flex items-center gap-3">
            <BarChart3 className="w-[18px] h-[18px] text-sidebar-label" />
            <span className="font-heading text-[13px] font-semibold text-ink">
              Analytics
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </button>
        <button
          onClick={openOptions}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-canvas transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-inset">
          <span className="flex items-center gap-3">
            <Settings2 className="w-[18px] h-[18px] text-sidebar-label" />
            <span className="font-heading text-[13px] font-semibold text-ink">
              Settings & Profile
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </button>
      </div>

      {/* Footer */}
      <div className="bg-[#F0EDE8] border-t border-canvas-divide px-5 py-3">
        <p className="font-body text-[11px] text-ink-secondary leading-relaxed">
          Tip: Right-click any job posting →{" "}
          <span className="font-medium text-ink">Generate CV for this job</span>
        </p>
      </div>
    </div>
  )
}

export default IndexPopup

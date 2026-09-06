import { useState } from "react"
import { BarChart3, Briefcase, ChevronRight, Settings2 } from "lucide-react"

import icon from "../assets/icon.png"

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

      // Firefox (MV2) has no chrome.sidePanel — fall back to the old popup window.
      const hasSidePanel = typeof chrome.sidePanel !== "undefined"

      const openPromise = hasSidePanel
        ? chrome.sidePanel.open({ tabId: tab.id })
        : null
      const enablePromise = hasSidePanel
        ? chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: "tabs/dialog.html",
            enabled: true
          })
        : null

      if (!hasSidePanel) {
        chrome.windows.create({
          url: chrome.runtime.getURL("tabs/dialog.html"),
          type: "popup",
          width: 500,
          height: 440,
          focused: true
        })
      }

      await chrome.storage.local.set({
        pendingJobData: { extracting: true }
      })
      if (enablePromise) await enablePromise
      if (openPromise) {
        try {
          await openPromise
        } catch {
          // open() raced ahead of setOptions() and found no panel registered
          // yet for this tab — enablePromise has resolved by now, so retry.
          await chrome.sidePanel.open({ tabId: tab.id })
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      let response
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: "getSource"
        })
      } catch {
        // content script not injected — fall through to the no-data branch
        response = null
      }

      if (!response?.data) {
        await chrome.storage.local.set({
          pendingJobData: { extracting: false, error: true }
        })
        setStatus("No job description found on this page")
        setLoading(false)
        return
      }

      await chrome.storage.local.set({
        pendingJobData: {
          selectedText: response.data,
          tabUrl: tab.url,
          tabId: tab.id,
          companyName: response.companyName || "",
          jobTitle: response.jobTitle || ""
        }
      })

      window.close()
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Error scraping job data"
      )
      setLoading(false)
    }
  }

  const openAppShell = (params = "") => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("options.html" + params)
    })
    window.close()
  }

  const openAnalytics = () =>
    openAppShell("?section=applications&view=overview")

  const openApplications = () => openAppShell("?section=applications")

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <div className="w-80 bg-canvas border-2 border-sidebar font-body">
      {/* Header */}
      <div className="bg-sidebar px-5 py-4 flex items-center gap-3">
        <img src={icon} alt="Bespoke" className="w-10 h-10 rounded shrink-0" />
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-[15px] font-bold text-canvas leading-tight">
            Bespoke
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
          <span className="font-medium text-ink">Check my match for this job</span>
        </p>
      </div>
    </div>
  )
}

export default IndexPopup

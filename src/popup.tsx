import { useState } from "react"
import { Briefcase, ChevronRight, Loader2, Settings, Sparkles } from "lucide-react"

import iconUrl from "url:../assets/icon.png"

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

      // Inject content script if not already present
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["contents/jobScrapper.js"]
      })

      await new Promise((resolve) => setTimeout(resolve, 500))

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSource"
      })

      if (!response?.data) {
        setStatus("No job description found on this page")
        setLoading(false)
        return
      }

      // Store job data for dialog
      chrome.storage.local.set({
        pendingJobData: {
          selectedText: response.data,
          tabUrl: tab.url,
          tabId: tab.id,
          companyName: response.companyName || "",
          jobTitle: response.jobTitle || ""
        }
      })

      // Open dialog window
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
    <div className="w-72 bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <img src={iconUrl} alt="JobTailor icon" className="w-9 h-9" />
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-tight">
              JobTailor
            </h1>
            <p className="text-xs text-gray-400 leading-tight">
              Tailor your CV to every job
            </p>
          </div>
        </div>
      </div>

      {/* Divider + nav */}
      <div className="border-t border-gray-100 mx-5" />
      <div className="px-3 py-2">
        <button
          onClick={openApplications}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-inset">
          <span className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            My Applications
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
        </button>
        <button
          onClick={openOptions}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-inset">
          <span className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            Settings & Profile
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
        </button>
      </div>

      {/* Tip */}
      <div className="px-5 pb-4 pt-1">
        <p className="text-xs text-gray-400 leading-relaxed">
          Tip: Right-click any job posting →{" "}
          <span className="font-medium text-gray-500">
            Generate CV for this job
          </span>
        </p>
      </div>
    </div>
  )
}

export default IndexPopup

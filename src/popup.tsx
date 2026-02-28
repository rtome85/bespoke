import { useState } from "react"

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
    <div className="w-72 p-5 bg-white">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">JobTailor</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tailor your CV to every job</p>
      </div>

      {status && (
        <p className="mb-3 text-sm text-red-600">{status}</p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
        <button
          onClick={openApplications}
          className="w-full text-sm text-gray-500 hover:text-purple-600 transition-colors text-left">
          My Applications
        </button>
        <button
          onClick={openOptions}
          className="w-full text-sm text-gray-500 hover:text-purple-600 transition-colors text-left">
          Settings & Profile
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Tip: Right-click on any job posting and select "Generate CV for this job"
      </p>
    </div>
  )
}

export default IndexPopup

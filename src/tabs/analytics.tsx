import { X } from "lucide-react"
import { useEffect, useState } from "react"

import { AnalyticsDashboard } from "~components/AnalyticsDashboard"
import type { SavedApplication } from "~types/userProfile"

import "../style.css"

function AnalyticsPage() {
  const [applications, setApplications] = useState<SavedApplication[]>([])

  useEffect(() => {
    chrome.storage.local.get("savedApplications", (res) => {
      if (res.savedApplications) setApplications(res.savedApplications)
    })
  }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-canvas border-b border-canvas-divide px-12 h-[72px] flex items-center justify-between">
        <div className="flex flex-col gap-[3px]">
          <h1 className="text-3xl font-bold tracking-[0.1em] text-ink leading-none uppercase">
            Analytics
          </h1>
          <p className="text-[13px] text-ink-secondary leading-none">
            Application tracking and insights
          </p>
        </div>
        <button
          onClick={() => window.close()}
          className="w-9 h-9 flex items-center justify-center bg-[#F0EDE8] text-sidebar-item hover:bg-canvas-divide transition-colors">
          <X size={18} />
        </button>
      </header>

      <main className="bg-canvas px-12 py-10">
        <AnalyticsDashboard applications={applications} />
      </main>
    </div>
  )
}

export default AnalyticsPage

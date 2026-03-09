import { useEffect, useState } from "react"

import { BarChart3 } from "lucide-react"

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
    <div className="min-h-screen bg-gray-50/80">
      {/* Compact header bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50">
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">
              Analytics
            </h1>
            <p className="text-[11px] text-gray-400 leading-tight">
              {applications.length} application{applications.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-5">
        <AnalyticsDashboard applications={applications} />
      </main>
    </div>
  )
}

export default AnalyticsPage

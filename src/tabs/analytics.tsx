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
      <header className="bg-canvas border-b-2 border-ink px-12 py-5">
        <div className="max-w-[1320px] mx-auto">
          <h1 className="font-heading text-xl font-bold tracking-widest text-ink uppercase">
            Analytics
          </h1>
          <p className="font-body text-[13px] text-ink-muted mt-1">
            Application tracking and insights
          </p>
        </div>
      </header>

      <main className="bg-canvas px-12 py-10">
        <div className="max-w-[1320px] mx-auto">
          <AnalyticsDashboard applications={applications} />
        </div>
      </main>
    </div>
  )
}

export default AnalyticsPage

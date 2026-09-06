import { useEffect } from "react"

import "../style.css"

/**
 * The standalone analytics tab was retired in the Phase 4 redesign — its
 * charts now live under Applications → Overview in the app shell. This page
 * stays only so old bookmarks and the packaged URL keep working; it forwards
 * straight there.
 */
function AnalyticsPage() {
  useEffect(() => {
    window.location.replace(
      chrome.runtime.getURL("options.html?section=applications&view=overview")
    )
  }, [])

  return (
    <div className="min-h-screen bg-aa-neutral-50 font-aa flex items-center justify-center">
      <p className="text-[13px] text-aa-text-secondary">
        Opening Applications → Overview…
      </p>
    </div>
  )
}

export default AnalyticsPage

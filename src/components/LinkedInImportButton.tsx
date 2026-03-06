import React, { useState } from "react"
import type { UserProfile } from "~types/userProfile"

interface LinkedInImportButtonProps {
  onImport: (data: Partial<UserProfile>) => void
}

type ImportState = "idle" | "loading" | "success" | "error" | "no-tab"

export function LinkedInImportButton({ onImport }: LinkedInImportButtonProps) {
  const [state, setState] = useState<ImportState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleImport() {
    setState("loading")
    setErrorMsg("")

    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      const isLinkedInProfile =
        activeTab?.url && /^https:\/\/(www\.)?linkedin\.com\/in\//.test(activeTab.url)

      if (!activeTab?.id || !isLinkedInProfile) {
        setState("no-tab")
        return
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "getLinkedInProfile"
      })

      if (!response || !response.success) {
        setErrorMsg(response?.error || "Failed to extract profile data")
        setState("error")
        return
      }

      onImport(response.data)
      setState("success")

      // Reset to idle after 3s
      setTimeout(() => setState("idle"), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error")
      setState("error")
    }
  }

  const isLoading = state === "loading"

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-blue-900">Import from LinkedIn</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Open your LinkedIn profile in a tab, then click Import.
          </p>
        </div>

        <button
          onClick={handleImport}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shrink-0">
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          )}
          {isLoading ? "Importing…" : "Import"}
        </button>
      </div>

      {state === "no-tab" && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          No LinkedIn profile tab found. Open{" "}
          <strong>linkedin.com/in/your-profile</strong> in a tab first.
        </p>
      )}

      {state === "success" && (
        <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Profile imported successfully. Review and save your changes below.
        </p>
      )}

      {state === "error" && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorMsg || "Something went wrong. Try refreshing the LinkedIn page."}
        </p>
      )}
    </div>
  )
}

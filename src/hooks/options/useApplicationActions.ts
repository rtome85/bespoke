import { useCallback } from "react"

import {
  mutateSavedApplications,
  setApplicationStatus
} from "~storage/savedApplications"
import type { SavedApplication } from "~types/userProfile"

export function useApplicationActions() {
  const updateApplication = useCallback(
    (id: string, patch: Partial<SavedApplication>) => {
      const { status, ...rest } = patch
      if (status) void setApplicationStatus(id, status)
      if (Object.keys(rest).length) {
        void mutateSavedApplications((current) =>
          current.map((app) => (app.id === id ? { ...app, ...rest } : app))
        )
      }
    },
    []
  )

  const deleteApplication = useCallback((id: string) => {
    void mutateSavedApplications((current) =>
      current.filter((app) => app.id !== id)
    )
  }, [])

  const openApplicationsWindow = useCallback(() => {
    chrome.windows.create({
      url: chrome.runtime.getURL("options.html#/applications"),
      type: "popup",
      width: 720,
      height: 560,
      focused: true
    })
  }, [])

  return { updateApplication, deleteApplication, openApplicationsWindow }
}

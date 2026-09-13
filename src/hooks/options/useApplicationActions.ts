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

  return { updateApplication, deleteApplication }
}

import { useEffect, useState } from "react"

import { STORAGE_KEYS } from "~storage/keys"
import { PROVIDER_META } from "~types/config"
import type { ModelRouting, PerplexityConfig, RouteTarget } from "~types/config"
import type { PendingJobData, RoutingLabels } from "~types/dialog"
import {
  DEFAULT_USER_PROFILE,
  type SavedApplication,
  type UserProfile
} from "~types/userProfile"

interface StoredDialogState {
  userProfile?: UserProfile
  pendingJobData?: PendingJobData
  savedApplications?: SavedApplication[]
  perplexityConfig?: PerplexityConfig
  modelRouting?: ModelRouting
}

function formatRouteTarget(target?: RouteTarget) {
  return target
    ? `${PROVIDER_META[target.provider]?.name ?? target.provider} · ${target.model}`
    : undefined
}

export function useDialogStoredState() {
  const [routingLabels, setRoutingLabels] = useState<RoutingLabels>({})
  const [userProfile, setUserProfile] =
    useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [savedApplications, setSavedApplications] = useState<
    SavedApplication[]
  >([])
  const [perplexityConfig, setPerplexityConfig] =
    useState<PerplexityConfig | null>(null)
  const [initialPendingJobData, setInitialPendingJobData] =
    useState<PendingJobData | null>(null)

  useEffect(() => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.PENDING_JOB_DATA,
        STORAGE_KEYS.SAVED_APPLICATIONS,
        "perplexityConfig",
        STORAGE_KEYS.MODEL_ROUTING
      ],
      (result: StoredDialogState) => {
        if (result.modelRouting) {
          setRoutingLabels({
            scoring: formatRouteTarget(result.modelRouting.scoring),
            drafting: formatRouteTarget(result.modelRouting.drafting)
          })
        }
        if (result.userProfile) setUserProfile(result.userProfile)
        if (result.savedApplications) {
          setSavedApplications(result.savedApplications)
        }
        if (result.perplexityConfig) {
          setPerplexityConfig(result.perplexityConfig)
        }
        if (result.pendingJobData) {
          setInitialPendingJobData(result.pendingJobData)
        }
      }
    )
  }, [])

  return {
    routingLabels,
    userProfile,
    setUserProfile,
    savedApplications,
    setSavedApplications,
    perplexityConfig,
    initialPendingJobData
  }
}

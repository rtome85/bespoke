import { useCallback, useEffect, useRef, useState } from "react"

import { migrateRestoredApplications } from "~lib/interviews/migrate"
import { STORAGE_KEYS } from "~storage/keys"
import type { OperationStatus } from "~types/options"
import {
  authorize,
  pull,
  revoke,
  type SyncConfig
} from "~utils/googleDriveSync"

const STATUS_DURATION_MS = 5_000

export function useDriveSync(syncConfig: SyncConfig | null) {
  const [syncStatus, setSyncStatus] = useState<OperationStatus>({
    type: "idle",
    message: ""
  })
  const statusTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(
    () => () => {
      statusTimersRef.current.forEach(clearTimeout)
      statusTimersRef.current.clear()
    },
    []
  )

  const scheduleReset = useCallback(() => {
    const timer = setTimeout(() => {
      setSyncStatus({ type: "idle", message: "" })
      statusTimersRef.current.delete(timer)
    }, STATUS_DURATION_MS)
    statusTimersRef.current.add(timer)
  }, [])

  const connectDrive = async () => {
    setSyncStatus({
      type: "loading",
      message: "Connecting to Google Drive..."
    })
    try {
      const token = await authorize()
      await chrome.storage.local.set({
        [STORAGE_KEYS.SYNC_CONFIG]: { token, lastSynced: null }
      })
      setSyncStatus({
        type: "success",
        message: "Connected! Your data will sync automatically."
      })
    } catch (error) {
      setSyncStatus({ type: "error", message: (error as Error).message })
    }
    scheduleReset()
  }

  const forcePull = async () => {
    if (!syncConfig?.token) return
    setSyncStatus({
      type: "loading",
      message: "Restoring from Google Drive..."
    })
    try {
      const restored = await pull(syncConfig.token)
      if (Object.prototype.hasOwnProperty.call(restored, "savedApplications")) {
        await migrateRestoredApplications(restored.interviewsSchemaVersion)
      }
      await chrome.storage.local.set({
        [STORAGE_KEYS.SYNC_CONFIG]: {
          ...syncConfig,
          lastSynced: new Date().toISOString()
        }
      })
      const pulled = await chrome.storage.local.get([
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.OLLAMA_CONFIG,
        STORAGE_KEYS.PERPLEXITY_CONFIG,
        STORAGE_KEYS.CUSTOM_PROMPTS,
        STORAGE_KEYS.LLM_TUNING
      ])
      await chrome.storage.local.set(pulled)
      setSyncStatus({
        type: "success",
        message: "Data restored from Google Drive!"
      })
    } catch (error) {
      setSyncStatus({ type: "error", message: (error as Error).message })
    }
    scheduleReset()
  }

  const disconnectDrive = async () => {
    if (!syncConfig?.token) return
    if (
      !confirm(
        "Disconnect Google Drive? Your local data will be kept, but automatic sync will stop."
      )
    ) {
      return
    }

    setSyncStatus({ type: "loading", message: "Disconnecting..." })
    try {
      await revoke(syncConfig.token)
    } finally {
      await chrome.storage.local.remove(STORAGE_KEYS.SYNC_CONFIG)
      setSyncStatus({ type: "idle", message: "" })
    }
  }

  return { syncStatus, connectDrive, forcePull, disconnectDrive }
}

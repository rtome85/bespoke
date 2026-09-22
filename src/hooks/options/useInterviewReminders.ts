import { useCallback, useEffect, useRef, useState } from "react"

import {
  clearAllReminderAlarms,
  DEFAULT_REMINDER_SETTINGS,
  normalizeReminderSettings,
  resyncAllReminderAlarms,
  sendTestReminder,
  type ReminderSettings
} from "~lib/interviews/reminders"
import { STORAGE_KEYS } from "~storage/keys"
import type { OperationStatus } from "~types/options"
import type { SavedApplication } from "~types/userProfile"

export function useInterviewReminders(apps: SavedApplication[]) {
  const [remindersOn, setRemindersOn] = useState(true)
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    DEFAULT_REMINDER_SETTINGS
  )
  const [testReminderStatus, setTestReminderStatus] = useState<OperationStatus>(
    { type: "idle", message: "" }
  )
  const remindersChain = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED,
        STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS
      ],
      (result) => {
        setRemindersOn(
          result[STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED] !== false
        )
        setReminderSettings(
          normalizeReminderSettings(
            result[STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS]
          )
        )
      }
    )
  }, [])

  // Serialize storage writes + alarm rebuilds so rapid clicks can't interleave.
  const enqueue = useCallback((reconcile: () => Promise<void>) => {
    const started = remindersChain.current.then(reconcile, reconcile)
    remindersChain.current = started.catch(() => {})
  }, [])

  const toggleReminders = useCallback(
    (next: boolean) => {
      setRemindersOn(next)
      enqueue(async () => {
        await chrome.storage.local.set({
          [STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED]: next
        })
        if (next) await resyncAllReminderAlarms(apps)
        else await clearAllReminderAlarms()
      })
    },
    [apps, enqueue]
  )

  const changeReminderSettings = useCallback(
    (next: ReminderSettings) => {
      setReminderSettings(next)
      enqueue(async () => {
        await chrome.storage.local.set({
          [STORAGE_KEYS.INTERVIEW_REMINDER_SETTINGS]: next
        })
        // No-op beyond clearing when reminders are off.
        await resyncAllReminderAlarms(apps)
      })
    },
    [apps, enqueue]
  )

  const testReminder = useCallback(async () => {
    setTestReminderStatus({ type: "loading", message: "" })
    try {
      const result = await sendTestReminder()
      setTestReminderStatus(
        result === "blocked"
          ? {
              type: "error",
              message:
                "Notifications are blocked for Bespoke. Allow them in your browser's site settings, then try again."
            }
          : {
              type: "success",
              message:
                "Test reminder sent. If nothing appeared, check that your operating system allows notifications from your browser."
            }
      )
    } catch (error) {
      setTestReminderStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Couldn't show a test notification."
      })
    }
  }, [])

  return {
    remindersOn,
    toggleReminders,
    reminderSettings,
    changeReminderSettings,
    testReminderStatus,
    testReminder
  }
}

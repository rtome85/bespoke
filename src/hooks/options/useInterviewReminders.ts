import { useCallback, useEffect, useRef, useState } from "react"

import {
  clearAllReminderAlarms,
  resyncAllReminderAlarms
} from "~lib/interviews/reminders"
import { STORAGE_KEYS } from "~storage/keys"
import type { SavedApplication } from "~types/userProfile"

export function useInterviewReminders(apps: SavedApplication[]) {
  const [remindersOn, setRemindersOn] = useState(true)
  const remindersChain = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    chrome.storage.local.get(
      STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED,
      (result) => {
        setRemindersOn(
          result[STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED] !== false
        )
      }
    )
  }, [])

  const toggleReminders = useCallback(
    (next: boolean) => {
      setRemindersOn(next)
      const reconcile = async () => {
        await chrome.storage.local.set({
          [STORAGE_KEYS.INTERVIEW_REMINDERS_ENABLED]: next
        })
        if (next) await resyncAllReminderAlarms(apps)
        else await clearAllReminderAlarms()
      }
      const started = remindersChain.current.then(reconcile, reconcile)
      remindersChain.current = started.catch(() => {})
    },
    [apps]
  )

  return { remindersOn, toggleReminders }
}

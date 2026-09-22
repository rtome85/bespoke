import {
  LEAD_TIMES,
  type LeadTimeKey,
  type ReminderSettings
} from "~lib/interviews/reminders"
import type { OperationStatus } from "~types/options"

interface Props {
  remindersOn: boolean
  settings: ReminderSettings
  testStatus: OperationStatus
  onToggleReminders: (enabled: boolean) => void
  onChangeSettings: (settings: ReminderSettings) => void
  onTestReminder: () => void
}

export function NotificationsSettingsScreen({
  remindersOn,
  settings,
  testStatus,
  onToggleReminders,
  onChangeSettings,
  onTestReminder
}: Props) {
  const toggleLeadTime = (key: LeadTimeKey, checked: boolean) => {
    const selected = new Set<LeadTimeKey>(settings.leadTimes)
    if (checked) selected.add(key)
    else selected.delete(key)
    onChangeSettings({
      ...settings,
      leadTimes: LEAD_TIMES.map((t) => t.key).filter((k) => selected.has(k))
    })
  }

  return (
    <div className="space-y-6">
      <div className="aa-card">
        <h2 className="aa-section-heading">Interview reminders</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={remindersOn}
            onChange={(event) => onToggleReminders(event.target.checked)}
            className="w-4 h-4 accent-aa-primary"
          />
          <span className="text-sm text-aa-text-primary">
            Notify me about scheduled interviews
          </span>
        </label>
        <p className="aa-hint">
          Uses your browser's notifications for rounds that have a date and
          time. Turn off to clear all pending reminders.
        </p>

        <hr className="aa-divider" />

        <fieldset
          disabled={!remindersOn}
          className="border-0 p-0 m-0 min-w-0 disabled:opacity-50">
          <legend className="aa-label">Before the interview</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LEAD_TIMES.map((lead) => (
              <label
                key={lead.key}
                className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.leadTimes.includes(lead.key)}
                  onChange={(event) =>
                    toggleLeadTime(lead.key, event.target.checked)
                  }
                  className="w-4 h-4 accent-aa-primary"
                />
                <span className="text-sm text-aa-text-primary">
                  {lead.label}
                </span>
              </label>
            ))}
          </div>
          {settings.leadTimes.length === 0 && (
            <p className="aa-hint">
              No lead times selected — you won't be reminded before interviews.
            </p>
          )}

          <hr className="aa-divider" />

          <p className="aa-label">After the interview</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.debriefNudge}
              onChange={(event) =>
                onChangeSettings({
                  ...settings,
                  debriefNudge: event.target.checked
                })
              }
              className="w-4 h-4 accent-aa-primary"
            />
            <span className="text-sm text-aa-text-primary">
              Remind me to log a debrief
            </span>
          </label>
          <p className="aa-hint">
            Sent 3 hours after the round starts if you haven't logged a debrief
            yet. Clicking it opens the debrief for that round.
          </p>
        </fieldset>
      </div>

      <div className="aa-card">
        <h2 className="aa-section-heading">Test notifications</h2>
        <p className="text-sm text-aa-text-secondary mb-4">
          Send a sample reminder to check that notifications reach you. Blocked
          notifications are the most common reason reminders don't appear.
        </p>
        <button
          type="button"
          onClick={onTestReminder}
          disabled={testStatus.type === "loading"}
          className="aa-btn-secondary">
          {testStatus.type === "loading" ? "Sending..." : "Send test reminder"}
        </button>
        {testStatus.type === "success" && (
          <div className="mt-4 aa-message-success">{testStatus.message}</div>
        )}
        {testStatus.type === "error" && (
          <div className="mt-4 aa-message-error">{testStatus.message}</div>
        )}
      </div>
    </div>
  )
}

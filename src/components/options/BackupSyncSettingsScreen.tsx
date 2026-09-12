import {
  ACCENT_BUTTON_CLASS,
  CARD_CLASS,
  DIVIDER_CLASS,
  ERROR_MESSAGE_CLASS,
  HINT_CLASS,
  INFO_MESSAGE_CLASS,
  SECONDARY_BUTTON_CLASS,
  SECTION_HEADING_CLASS,
  SUCCESS_MESSAGE_CLASS
} from "~constants/options"
import type { OperationStatus } from "~types/options"
import type { SyncConfig } from "~utils/googleDriveSync"

interface Props {
  remindersOn: boolean
  syncConfig: SyncConfig | null
  syncStatus: OperationStatus
  onToggleReminders: (enabled: boolean) => void
  onConnectDrive: () => void
  onForcePull: () => void
  onDisconnectDrive: () => void
  onExportData: () => void
  onImportData: () => void
}

export function BackupSyncSettingsScreen({
  remindersOn,
  syncConfig,
  syncStatus,
  onToggleReminders,
  onConnectDrive,
  onForcePull,
  onDisconnectDrive,
  onExportData,
  onImportData
}: Props) {
  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Interview reminders</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={remindersOn}
            onChange={(event) => onToggleReminders(event.target.checked)}
            className="w-4 h-4 accent-aa-primary"
          />
          <span className="text-sm text-aa-text-primary">
            Notify me before a scheduled interview — 1 day and 1 hour ahead
          </span>
        </label>
        <p className={HINT_CLASS}>
          Uses your browser's notifications for rounds that have a date and
          time. Turn off to clear all pending reminders.
        </p>
      </div>

      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Google Drive Sync</h2>
        <p className="text-sm text-aa-text-secondary mb-6">
          Sync your profile, settings, and saved applications across computers.
          Data is stored privately in your Google Drive app folder — only
          Bespoke can access it.
        </p>
        <hr className={DIVIDER_CLASS} />

        {!syncConfig?.token ? (
          <div className="flex flex-col gap-4">
            <div className={INFO_MESSAGE_CLASS}>
              <p className="font-semibold text-[11px] uppercase tracking-widest mb-2">
                How it works
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Connect once per device with your Google account</li>
                <li>Changes sync automatically after 2 seconds</li>
                <li>On a new device, connect and use Force Pull to restore</li>
                <li>
                  Your data is stored in a private app folder, not visible in
                  Drive
                </li>
              </ul>
            </div>
            <div>
              <button
                type="button"
                onClick={onConnectDrive}
                disabled={syncStatus.type === "loading"}
                className="px-6 py-3 bg-aa-secondary text-aa-text-on-primary border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 hover:opacity-90 transition-colors">
                {syncStatus.type === "loading"
                  ? "Connecting..."
                  : "Connect Google Drive"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-aa-success-soft border border-aa-success-strong p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-aa-success" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-aa-success-strong">
                  Connected
                </span>
              </div>
              {syncConfig.lastSynced && (
                <p className="text-xs text-aa-success-strong">
                  Last synced:{" "}
                  {new Date(syncConfig.lastSynced).toLocaleString()}
                </p>
              )}
              {!syncConfig.lastSynced && (
                <p className="text-xs text-aa-success-strong">
                  Sync will happen automatically when you make changes.
                </p>
              )}
              {syncConfig.error && (
                <p className="text-xs text-aa-error-strong mt-1">
                  Last sync error: {syncConfig.error}
                </p>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={onForcePull}
                disabled={syncStatus.type === "loading"}
                className={ACCENT_BUTTON_CLASS}>
                {syncStatus.type === "loading"
                  ? "Restoring..."
                  : "Force Pull from Drive"}
              </button>
              <button
                type="button"
                onClick={onDisconnectDrive}
                disabled={syncStatus.type === "loading"}
                className={SECONDARY_BUTTON_CLASS}>
                Disconnect
              </button>
            </div>
          </div>
        )}

        {syncStatus.type === "success" && (
          <div className={`mt-4 ${SUCCESS_MESSAGE_CLASS}`}>
            {syncStatus.message}
          </div>
        )}
        {syncStatus.type === "error" && (
          <div className={`mt-4 ${ERROR_MESSAGE_CLASS}`}>
            {syncStatus.message}
          </div>
        )}
      </div>

      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Manual Export / Import</h2>
        <p className="text-sm text-aa-text-secondary mb-6">
          Download a full backup or restore from a previously exported file.
          Includes profile, settings, and all saved applications with generated
          CVs and cover letters.
        </p>
        <hr className={DIVIDER_CLASS} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onExportData}
            className="px-5 py-2.5 bg-aa-success-strong text-aa-text-on-primary border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-colors">
            Export Data
          </button>
          <button
            type="button"
            onClick={onImportData}
            className="px-5 py-2.5 bg-aa-secondary text-aa-text-on-primary border-0 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-90 transition-colors">
            Import Data
          </button>
        </div>
      </div>
    </div>
  )
}

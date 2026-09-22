import { ChevronRight } from "lucide-react"

import { ProviderIcon } from "~components/options/ProviderIcon"
import type { ProviderRosterEntry } from "~lib/options/providerStatus"

interface Props {
  entry: ProviderRosterEntry
  /** The row whose detail dialog is open, kept marked behind the scrim. */
  isOpen: boolean
  onOpen: () => void
}

export function ProviderRosterRow({ entry, isOpen, onOpen }: Props) {
  const { status } = entry

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`aa-roster-grid w-full border-t border-aa-border px-5 py-3.5 text-left transition-colors ${
        isOpen ? "bg-aa-primary-soft" : "bg-aa-surface hover:bg-aa-neutral-50"
      }`}>
      <span className="flex min-w-0 items-center gap-aa-3">
        <span
          className={`grid h-aa-px-30 w-aa-px-30 shrink-0 place-items-center rounded-aa-md ${
            isOpen ? "bg-aa-surface" : "bg-aa-neutral-100"
          }`}>
          <ProviderIcon
            id={entry.id}
            className="h-aa-px-17 w-aa-px-17 text-aa-neutral-700"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-aa-sm font-semibold text-aa-text-primary">
            {entry.name}
          </span>
          <span className="block truncate text-aa-11 text-aa-text-secondary">
            {entry.meta}
          </span>
        </span>
      </span>

      <span className="truncate text-aa-caption text-aa-text-secondary">
        {entry.access}
      </span>

      <span
        className={
          status.tone === "ok"
            ? "aa-status aa-status-ok"
            : status.tone === "warn"
              ? "aa-status aa-status-warn"
              : status.tone === "bad"
                ? "aa-status aa-status-bad"
                : "aa-status aa-status-idle"
        }>
        <span className="aa-status-dot" />
        {status.label}
      </span>

      <ChevronRight className="h-aa-px-18 w-aa-px-18 text-aa-neutral-400" />
    </button>
  )
}

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  LayoutList
} from "lucide-react"

import { SettingsRail } from "~components/SettingsRail"
import {
  needsDebrief,
  roundsThisWeek,
  roundsWithApp
} from "~lib/interviews/selectors"
import type { SettingsNavGroup } from "~types/options"
import type { SavedApplication } from "~types/userProfile"

/**
 * Second-level nav for the Applications area — same dark grouped rail as
 * Settings, with a VIEWS group and an INTERVIEWS group. `active` is the current
 * route's view key (`all` / `overview` / `schedule` / `prep` / `debriefs`);
 * `onSelect` receives that key and the caller maps it to a hash.
 */
export function ApplicationsRail({
  active,
  apps,
  onSelect
}: {
  active: string
  apps: SavedApplication[]
  onSelect: (value: string) => void
}) {
  const refs = roundsWithApp(apps)
  const weekCount = roundsThisWeek(refs).length
  const debriefCount = needsDebrief(refs).length

  const groups: SettingsNavGroup[] = [
    {
      label: "Views",
      items: [
        {
          label: "All applications",
          value: "all",
          subtitle: "",
          icon: LayoutList,
          badge: apps.length || undefined
        },
        { label: "Overview", value: "overview", subtitle: "", icon: BarChart3 }
      ]
    },
    {
      label: "Interviews",
      items: [
        {
          label: "Schedule",
          value: "schedule",
          subtitle: "",
          icon: CalendarDays,
          badge: weekCount || undefined
        },
        { label: "Prep", value: "prep", subtitle: "", icon: BookOpen },
        {
          label: "Debriefs",
          value: "debriefs",
          subtitle: "",
          icon: ClipboardCheck,
          badge: debriefCount || undefined
        }
      ]
    }
  ]

  return <SettingsRail groups={groups} active={active} onSelect={onSelect} />
}

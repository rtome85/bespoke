import type { DebriefOutcome, RoundFormat, RoundType } from "~types/userProfile"

export const ROUND_TYPE_OPTIONS: { value: RoundType; label: string }[] = [
  { value: "HR", label: "HR Interview" },
  { value: "Technical", label: "Technical" },
  { value: "Final", label: "Final" },
  { value: "Custom", label: "Custom…" }
]

export const ROUND_TYPE_ORDER: RoundType[] = ROUND_TYPE_OPTIONS.map(
  ({ value }) => value
)

export const ROUND_FORMAT_OPTIONS: { value: RoundFormat; label: string }[] = [
  { value: "phone", label: "Phone call" },
  { value: "video", label: "Video" },
  { value: "onsite", label: "On-site" }
]

export const DEBRIEF_OUTCOME_OPTIONS: {
  value: DebriefOutcome
  label: string
}[] = [
  { value: "advance", label: "Advance to the next round" },
  { value: "offer", label: "Offer" },
  { value: "reject", label: "Reject" },
  { value: "waiting", label: "Still waiting" }
]

export const DEBRIEF_OUTCOME_ORDER: DebriefOutcome[] =
  DEBRIEF_OUTCOME_OPTIONS.map(({ value }) => value)

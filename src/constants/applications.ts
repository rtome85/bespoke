import type { ApplicationStatus } from "~types/userProfile"

export const APPLICATION_STATUSES = [
  "Saved",
  "Applied",
  "Interviewing",
  "Offer",
  "Reject"
] as const satisfies readonly ApplicationStatus[]

export const LIST_POPULATIONS = ["sent", "replied", "interviewed"] as const

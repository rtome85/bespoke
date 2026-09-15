import { STORAGE_KEYS } from "~storage/keys"
import type { ApplicationStatus, SavedApplication } from "~types/userProfile"

/**
 * Comparison key for a company / job-title field — case-, accent- and
 * punctuation-insensitive, so "Acme, Inc." and "acme inc" collide. Letters and
 * digits of any script are kept (stripping everything outside `[a-z0-9]` would
 * flatten every CJK title to the same empty key and match them all), and only
 * the Latin combining marks are dropped — `\p{Diacritic}` would also strip the
 * Japanese dakuten and turn ジ into シ.
 */
export function normalizeApplicationField(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

const lastTouchedMs = (application: SavedApplication): number =>
  Date.parse(application.statusUpdatedAt ?? application.createdAt) || 0

/**
 * The tracked application for the same company + job title, or `null` when
 * this opening is new. Ties are broken by the most recently touched entry, so
 * the copy shown to the user reflects where that application stands now.
 */
export function findDuplicateApplication(
  applications: SavedApplication[],
  company: string,
  jobTitle: string
): SavedApplication | null {
  const companyKey = normalizeApplicationField(company)
  const titleKey = normalizeApplicationField(jobTitle)
  if (!companyKey || !titleKey) return null

  return applications.reduce<SavedApplication | null>((best, application) => {
    if (
      normalizeApplicationField(application.company ?? "") !== companyKey ||
      normalizeApplicationField(application.jobTitle ?? "") !== titleKey
    ) {
      return best
    }
    return !best || lastTouchedMs(application) > lastTouchedMs(best)
      ? application
      : best
  }, null)
}

/**
 * Same check against the stored list. Read fresh rather than from a React
 * snapshot — the options page may have added an application while the panel
 * sat open.
 */
export async function findStoredDuplicateApplication(
  company: string,
  jobTitle: string
): Promise<SavedApplication | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.SAVED_APPLICATIONS)
  const applications = stored[STORAGE_KEYS.SAVED_APPLICATIONS]
  return findDuplicateApplication(
    Array.isArray(applications) ? applications : [],
    company,
    jobTitle
  )
}

const DUPLICATE_LEAD: Record<ApplicationStatus, string> = {
  Saved: "You already saved this job opening.",
  Applied: "You already applied to this job opening.",
  Interviewing: "You're already interviewing for this job opening.",
  Offer: "You already have an offer for this job opening.",
  Reject: "You already applied to this job opening and were rejected."
}

function trackedDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  if (!y || !m || !d) return date
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}

/** Status-aware headline for the duplicate dialog. */
export function duplicateApplicationTitle(
  application: SavedApplication
): string {
  return DUPLICATE_LEAD[application.status] ?? DUPLICATE_LEAD.Saved
}

/** Which entry the headline is about, and when it was tracked. */
export function duplicateApplicationDetail(
  application: SavedApplication
): string {
  const opening = `${application.jobTitle} at ${application.company}`
  const tracked = trackedDate(application.date)
  return tracked ? `${opening} — tracked since ${tracked}.` : `${opening}.`
}

export const ROUTES = {
  applications: "#/applications",
  applicationsOverview: "#/applications/overview",
  interviewSchedule: "#/interviews/schedule",
  interviewPrep: "#/interviews/prep",
  interviewDebriefs: "#/interviews/debriefs",
  settings: "#/settings"
} as const

export const APPLICATION_RAIL_ROUTES: Record<string, string> = {
  all: ROUTES.applications,
  overview: ROUTES.applicationsOverview,
  schedule: ROUTES.interviewSchedule,
  prep: ROUTES.interviewPrep,
  debriefs: ROUTES.interviewDebriefs
}

export function applicationFilterRoute(filter: string) {
  return `${ROUTES.applications}/all/${encodeURIComponent(filter)}`
}

export function interviewPrepRoute(roundId: string) {
  return `${ROUTES.interviewPrep}/${encodeURIComponent(roundId)}`
}

export function interviewDebriefRoute(roundId: string) {
  return `${ROUTES.interviewDebriefs}/${encodeURIComponent(roundId)}`
}

export function settingsRoute(tab: string) {
  return `${ROUTES.settings}/${encodeURIComponent(tab)}`
}

export function optionsPagePath(route = "") {
  return `options.html${route}`
}

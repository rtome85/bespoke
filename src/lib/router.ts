import { useCallback, useEffect, useState } from "react"

import { STORAGE_KEYS } from "~storage/keys"

// Hash routing for the app shell (`options.html`). No library — the shell has a
// handful of screens and a flat structure.
//
//   #/applications                 All applications list  (default)
//   #/applications/overview        Overview
//   #/interviews/schedule          Schedule (agenda)
//   #/interviews/prep              Prep — upcoming rounds
//   #/interviews/prep/:roundId     Prep workspace
//   #/interviews/debriefs          Debriefs — list
//   #/interviews/debriefs/:roundId Debrief workspace
//   #/settings/:tab                Settings (existing tab keys)

export type RouteArea = "applications" | "interviews" | "settings"

export interface Route {
  area: RouteArea
  /** "all" | "overview" | "schedule" | "prep" | "debriefs" | <settings tab> | "" */
  view: string
  /** :roundId for the prep / debrief workspaces */
  param?: string
  /** Normalized `#/...` for this route. */
  hash: string
}

const DEFAULT_HASH = "#/applications"
const INTERVIEW_VIEWS = ["schedule", "prep", "debriefs"]

function buildHash(area: string, view: string, param: string): string {
  let h = `#/${area}`
  if (view) h += `/${view}`
  if (param) h += `/${encodeURIComponent(param)}`
  return h
}

export function normalizeRoute(hash: string): Route {
  const raw = (hash || "").replace(/^#\/?/, "").split("?")[0]
  const [rawArea = "", rawView = "", rawParam = ""] = raw
    .split("/")
    .map((s) => {
      try {
        return decodeURIComponent(s)
      } catch {
        return s
      }
    })

  if (rawArea === "settings") {
    return {
      area: "settings",
      view: rawView,
      param: rawParam || undefined,
      hash: buildHash("settings", rawView, rawParam)
    }
  }

  if (rawArea === "interviews") {
    const view = INTERVIEW_VIEWS.includes(rawView) ? rawView : "schedule"
    return {
      area: "interviews",
      view,
      param: rawParam || undefined,
      hash: buildHash("interviews", view, rawParam)
    }
  }

  // Anything else falls back to the applications area.
  const view = rawView === "overview" ? "overview" : "all"
  return {
    area: "applications",
    view,
    hash: buildHash("applications", view, "")
  }
}

/** Legacy `?section=…&view=…` deep links (old popup / analytics tab bookmarks). */
function legacySectionHash(): string | null {
  const q = new URLSearchParams(window.location.search)
  const section = q.get("section")
  if (section === "settings") return "#/settings"
  if (section === "applications") {
    return q.get("view") === "overview"
      ? "#/applications/overview"
      : "#/applications"
  }
  return null
}

const persist = (hash: string) => {
  try {
    chrome.storage.local.set({ [STORAGE_KEYS.LAST_ROUTE]: hash })
  } catch {
    /* storage can be unavailable in odd contexts */
  }
}

export function useHashRoute(): {
  route: Route
  navigate: (hash: string, opts?: { replace?: boolean }) => void
} {
  const [route, setRoute] = useState<Route>(() =>
    normalizeRoute(window.location.hash)
  )

  const apply = useCallback((hash: string, replace = false) => {
    const next = normalizeRoute(hash)
    const current = window.location.hash || "#/"
    if (current === next.hash) {
      setRoute(next) // same hash, no `hashchange` — sync state directly
    } else if (replace) {
      history.replaceState(null, "", next.hash)
      setRoute(next)
    } else {
      window.location.hash = next.hash // fires `hashchange` → listener updates
    }
    persist(next.hash)
  }, [])

  const navigate = useCallback(
    (hash: string, opts?: { replace?: boolean }) => apply(hash, opts?.replace),
    [apply]
  )

  useEffect(() => {
    const onHashChange = () => {
      const next = normalizeRoute(window.location.hash)
      setRoute(next)
      persist(next.hash)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  // First-load resolution when there's no explicit hash: honour a legacy
  // `?section=`, else restore the last route, else land on the default.
  useEffect(() => {
    const h = window.location.hash
    if (h && h !== "#" && h !== "#/") {
      persist(normalizeRoute(h).hash)
      return
    }
    const legacy = legacySectionHash()
    if (legacy) {
      apply(legacy, true)
      return
    }
    chrome.storage.local.get(STORAGE_KEYS.LAST_ROUTE, (res) => {
      const last = res[STORAGE_KEYS.LAST_ROUTE]
      apply(
        typeof last === "string" && last.startsWith("#/") ? last : DEFAULT_HASH,
        true
      )
    })
  }, [apply])

  return { route, navigate }
}

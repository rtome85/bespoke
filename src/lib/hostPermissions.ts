/**
 * Runtime host permissions.
 *
 * Reading an employer's own website means fetching a domain we can't know at
 * install time, so the all-sites match pattern sits in
 * `optional_host_permissions` and is asked for only when the user opts into
 * site research for a specific company.
 * `chrome.permissions.request` needs a user gesture, so it must be called from
 * a click handler in a UI document — never from the service worker, which only
 * ever checks whether the grant already exists.
 */

const patternFor = (origin: string): string => `${origin}/*`

/** Has the user already granted access to this origin? */
export async function hasHostPermission(origin: string): Promise<boolean> {
  if (typeof chrome?.permissions?.contains !== "function") return false
  try {
    return await chrome.permissions.contains({ origins: [patternFor(origin)] })
  } catch {
    return false
  }
}

/**
 * Ask for access to one origin. Must be called directly from a user gesture;
 * resolves false when the user declines or the API is unavailable (Firefox
 * MV2 grants host permissions at install, so `contains` answers true there
 * and this is never reached).
 */
export async function requestHostPermission(
  origin: string
): Promise<boolean> {
  if (typeof chrome?.permissions?.request !== "function") return false
  try {
    return await chrome.permissions.request({ origins: [patternFor(origin)] })
  } catch {
    return false
  }
}

import { sendToBackground } from "@plasmohq/messaging"

import { optionsPagePath, ROUTES } from "~constants/routes"

// The report flow runs inside the side panel on Chrome, which has no window
// to close. Firefox MV2 has no chrome.sidePanel, so close its popup window.
export async function closeSidePanel() {
  if (typeof chrome.sidePanel === "undefined") {
    window.close()
    return
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabId = tabs[0]?.id
  if (tabId !== undefined) {
    await chrome.sidePanel.setOptions({ tabId, enabled: false })
  }
}

export function openApplicationsList() {
  chrome.tabs.create({
    url: chrome.runtime.getURL(optionsPagePath(ROUTES.applications))
  })
}

/**
 * Close the panel on this tab, then open the applications list in a new tab.
 *
 * `window.close()` is what actually dismisses an open side panel —
 * `setOptions({ enabled: false })` only stops it re-appearing on that tab, so
 * the worker is handed that (to keep the panel from popping back) plus the
 * tab creation, which can't happen here: this document is gone the moment the
 * panel closes. `sendToBackground` calls `chrome.runtime.sendMessage`
 * synchronously, so the message is already dispatched by then.
 */
export async function openApplicationsListAndClosePanel() {
  if (typeof chrome.sidePanel === "undefined") {
    openApplicationsList()
    window.close()
    return
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  void sendToBackground({
    name: "openApplicationsList",
    body: { tabId: tabs[0]?.id }
  })
  window.close()
}

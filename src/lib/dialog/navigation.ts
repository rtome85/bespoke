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
    url: chrome.runtime.getURL("options.html#/applications")
  })
}

import { OllamaClient } from "~api/ollamaClient"
import { STORAGE_KEYS } from "~storage/keys"

export async function createContextMenu() {
  await chrome.contextMenus.removeAll()

  chrome.contextMenus.create({
    id: "generateCV",
    title: "Check my match for this job",
    contexts: ["selection", "page"]
  })
}

function showExtractionError() {
  const manifest = chrome.runtime.getManifest()
  const iconPath = manifest.icons?.["128"] ?? manifest.icons?.["64"] ?? ""
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL(iconPath),
    title: "Unable to extract the details",
    message: "Select the job posting text, right-click and try again."
  })
}

async function setExtractionError() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: false, error: true }
  })
  showExtractionError()
}

export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  if (info.menuItemId !== "generateCV" || !tab) return

  // Firefox (MV2) has no chrome.sidePanel — fall back to the old popup window.
  const hasSidePanel = typeof chrome.sidePanel !== "undefined"

  // The manifest deliberately has no side_panel.default_path — that would
  // make the panel available on every tab, so switching tabs would carry it
  // along. It's registered per tab here instead, which also re-enables it
  // after a previous close disabled it for this tab.
  //
  // Both calls are dispatched without an `await` between them: setOptions()
  // is queued first so the panel exists for this tab by the time open() is
  // handled, and open() only counts as a response to the user's click while
  // no `await` has run yet — even a fast internal call like
  // chrome.storage.local.set() is enough to lose the gesture and make Chrome
  // reject it.
  const enablePromise = hasSidePanel
    ? chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "tabs/dialog.html",
        enabled: true
      })
    : null
  const openPromise = hasSidePanel
    ? chrome.sidePanel.open({ tabId: tab.id })
    : null

  if (!hasSidePanel) {
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/dialog.html"),
      type: "popup",
      width: 500,
      height: 440,
      focused: true
    })
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: true }
  })
  if (enablePromise) await enablePromise
  if (openPromise) {
    try {
      await openPromise
    } catch {
      // open() was handled before setOptions() registered the panel for this
      // tab — enablePromise has resolved by now, so retry. The click gesture
      // may have expired, in which case this throws too and the panel simply
      // doesn't open; the extraction below still runs.
      try {
        await chrome.sidePanel.open({ tabId: tab.id })
      } catch {
        // Nothing left to try — leave the panel closed rather than throwing
        // out of the context-menu listener.
      }
    }
  }

  const selectedText = info.selectionText?.trim() || ""
  const isLinkedIn = tab.url?.includes("linkedin.com") ?? false
  const isLinkedInJobView =
    (tab.url?.includes("/jobs/view") || tab.url?.includes("currentJobId=")) ??
    false

  // Get raw page content from content script
  let scraped = { data: "", companyName: "", jobTitle: "" }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "getSource"
    })
    if (response) scraped = response
  } catch {
    // content script not injected — raw text will be empty
  }

  // ── LinkedIn job listing pages: use LLM extraction ──────────────────────
  if (isLinkedIn && isLinkedInJobView) {
    const rawText = selectedText || scraped.data
    if (!rawText) {
      await setExtractionError()
      return
    }

    const storage = await chrome.storage.local.get([STORAGE_KEYS.OLLAMA_CONFIG])
    const ollamaConfig = storage[STORAGE_KEYS.OLLAMA_CONFIG]

    if (!ollamaConfig?.apiKey) {
      await setExtractionError()
      return
    }

    try {
      const client = new OllamaClient(ollamaConfig)
      const extracted = await client.extractJobDetails(
        rawText,
        "gemma4:cloud"
      )

      await chrome.storage.local.set({
        [STORAGE_KEYS.PENDING_JOB_DATA]: {
          selectedText: extracted.jobDescription || rawText,
          tabUrl: tab.url,
          tabId: tab.id,
          companyName: extracted.companyName || scraped.companyName,
          jobTitle: extracted.jobTitle || scraped.jobTitle
        }
      })
    } catch {
      await setExtractionError()
    }
    return
  }

  // ── Other LinkedIn pages: keep existing CSS-selector path ───────────────
  if (isLinkedIn) {
    const jobDescription = selectedText || scraped.data
    if (!jobDescription) {
      await setExtractionError()
      return
    }
    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_JOB_DATA]: {
        selectedText: jobDescription,
        tabUrl: tab.url,
        tabId: tab.id,
        companyName: scraped.companyName,
        jobTitle: scraped.jobTitle
      }
    })
    return
  }

  // ── Non-LinkedIn: LLM extraction ───────────────────────────────────────
  const rawText = selectedText || scraped.data
  if (!rawText) {
    await setExtractionError()
    return
  }

  const storage = await chrome.storage.local.get([STORAGE_KEYS.OLLAMA_CONFIG])
  const ollamaConfig = storage[STORAGE_KEYS.OLLAMA_CONFIG]

  if (!ollamaConfig?.apiKey) {
    await setExtractionError()
    return
  }

  try {
    const client = new OllamaClient(ollamaConfig)
    const extracted = await client.extractJobDetails(
      rawText,
      "gemma4:cloud"
    )

    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_JOB_DATA]: {
        selectedText: extracted.jobDescription || rawText,
        tabUrl: tab.url,
        tabId: tab.id,
        companyName: scraped.companyName || extracted.companyName,
        jobTitle: scraped.jobTitle || extracted.jobTitle
      }
    })
  } catch {
    await setExtractionError()
  }
}

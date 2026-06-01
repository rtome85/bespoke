import { OllamaClient } from "~api/ollamaClient"
import { STORAGE_KEYS } from "~storage/keys"

export async function createContextMenu() {
  await chrome.contextMenus.removeAll()

  chrome.contextMenus.create({
    id: "generateCV",
    title: "Generate CV for this job",
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

export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  if (info.menuItemId !== "generateCV" || !tab) return

  const selectedText = info.selectionText?.trim() || ""
  const isLinkedIn = tab.url?.includes("linkedin.com") ?? false
  const isLinkedInJobView =
    (tab.url?.includes("/jobs/view") || tab.url?.includes("currentJobId=")) ?? false

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
      showExtractionError()
      return
    }

    const storage = await chrome.storage.local.get([STORAGE_KEYS.OLLAMA_CONFIG])
    const ollamaConfig = storage[STORAGE_KEYS.OLLAMA_CONFIG]

    if (!ollamaConfig?.apiKey) {
      showExtractionError()
      return
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: true }
    })
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/dialog.html"),
      type: "popup",
      width: 500,
      height: 440,
      focused: true
    })

    try {
      const client = new OllamaClient(ollamaConfig)
      const extracted = await client.extractJobDetails(
        rawText,
        "ministral-3:3b-cloud"
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
      await chrome.storage.local.set({
        [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: false, error: true }
      })
      showExtractionError()
    }
    return
  }

  // ── Other LinkedIn pages: keep existing CSS-selector path ───────────────
  if (isLinkedIn) {
    const jobDescription = selectedText || scraped.data
    if (!jobDescription) {
      showExtractionError()
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
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/dialog.html"),
      type: "popup",
      width: 500,
      height: 440,
      focused: true
    })
    return
  }

  // ── Non-LinkedIn: LLM extraction ───────────────────────────────────────
  const rawText = selectedText || scraped.data
  if (!rawText) {
    showExtractionError()
    return
  }

  const storage = await chrome.storage.local.get([STORAGE_KEYS.OLLAMA_CONFIG])
  const ollamaConfig = storage[STORAGE_KEYS.OLLAMA_CONFIG]

  if (!ollamaConfig?.apiKey) {
    showExtractionError()
    return
  }

  // Open dialog immediately with extracting state so user gets instant feedback
  await chrome.storage.local.set({
    [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: true }
  })
  chrome.windows.create({
    url: chrome.runtime.getURL("tabs/dialog.html"),
    type: "popup",
    width: 500,
    height: 440,
    focused: true
  })

  try {
    const client = new OllamaClient(ollamaConfig)
    const extracted = await client.extractJobDetails(
      rawText,
      "ministral-3:3b-cloud"
    )

    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_JOB_DATA]: {
        selectedText: extracted.jobDescription || rawText,
        tabUrl: tab.url,
        tabId: tab.id,
        companyName: extracted.companyName,
        jobTitle: extracted.jobTitle
      }
    })
  } catch {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: false, error: true }
    })
    showExtractionError()
  }
}

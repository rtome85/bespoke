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

  // sidePanel.open() only counts as a response to the user's click if it's
  // called before the function's first `await` — even a fast internal call
  // like chrome.storage.local.set() is enough to lose the gesture and make
  // Chrome reject it. Fire it synchronously first; the manifest's
  // side_panel.default_path means it doesn't need setOptions() to resolve
  // first. Re-enable it for this tab (in case a prior close disabled it)
  // and show the "extracting" placeholder afterwards.
  const openPromise = chrome.sidePanel.open({ tabId: tab.id })
  const enablePromise = chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "tabs/dialog.html",
    enabled: true
  })

  await chrome.storage.local.set({
    [STORAGE_KEYS.PENDING_JOB_DATA]: { extracting: true }
  })
  await enablePromise
  await openPromise

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

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
    title: "Não foi possível extrair os detalhes",
    message:
      "Seleciona o texto da oferta de trabalho, clica com o botão direito e tenta novamente."
  })
}

export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  if (info.menuItemId !== "generateCV" || !tab) return

  const selectedText = info.selectionText?.trim() || ""
  const isLinkedIn = tab.url?.includes("linkedin.com") ?? false

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

  // ── LinkedIn: keep existing CSS-selector path ──────────────────────────
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

  try {
    const client = new OllamaClient(ollamaConfig)
    const extracted = await client.extractJobDetails(rawText, "ministral-3:3b-cloud")

    await chrome.storage.local.set({
      [STORAGE_KEYS.PENDING_JOB_DATA]: {
        selectedText: extracted.jobDescription || rawText,
        tabUrl: tab.url,
        tabId: tab.id,
        companyName: extracted.companyName,
        jobTitle: extracted.jobTitle
      }
    })

    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/dialog.html"),
      type: "popup",
      width: 500,
      height: 440,
      focused: true
    })
  } catch {
    showExtractionError()
  }
}

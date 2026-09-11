import type { PlasmoMessaging } from "@plasmohq/messaging"

const PREVIEW_WIDTH = 720
const PREVIEW_HEIGHT = 780

// Tracks the currently open preview window (if any) so repeat "Preview"
// clicks focus it instead of spawning duplicates. Registered at module top
// level per the MV3 service-worker gotcha — it must survive worker restarts,
// though a restart does lose this in-memory reference (the next click just
// opens a fresh window, which is an acceptable edge case here).
let previewWindowId: number | null = null

chrome.windows.onRemoved.addListener((id) => {
  if (id === previewWindowId) previewWindowId = null
})

// The side panel can't paint outside its own docked strip, so "preview
// centered on the page" has to be a real, separate browser window —
// centered against whichever normal window the user is currently looking at.
const handler: PlasmoMessaging.MessageHandler = async (_req, res) => {
  try {
    if (previewWindowId !== null) {
      try {
        await chrome.windows.update(previewWindowId, { focused: true })
        res.send({ success: true })
        return
      } catch {
        previewWindowId = null
      }
    }

    const anchor = await chrome.windows.getLastFocused({
      windowTypes: ["normal"]
    })
    // No Math.max(0, ...) clamp here — a window on a monitor positioned
    // left of or above the primary one legitimately has negative
    // left/top, and clamping would push the popup onto the wrong monitor.
    const left = Math.round(
      (anchor.left ?? 0) + ((anchor.width ?? PREVIEW_WIDTH) - PREVIEW_WIDTH) / 2
    )
    const top = Math.round(
      (anchor.top ?? 0) +
        ((anchor.height ?? PREVIEW_HEIGHT) - PREVIEW_HEIGHT) / 2
    )

    const created = await chrome.windows.create({
      url: chrome.runtime.getURL("tabs/documentPreview.html"),
      type: "popup",
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      left,
      top,
      focused: true
    })
    previewWindowId = created.id ?? null

    res.send({ success: true })
  } catch (error) {
    res.send({
      success: false,
      message:
        error instanceof Error ? error.message : "Could not open the preview"
    })
  }
}

export default handler

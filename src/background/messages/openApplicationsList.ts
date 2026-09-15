import type { PlasmoMessaging } from "@plasmohq/messaging"

/**
 * Close the side panel on the current tab, then open the tracked-applications
 * list in a new tab — in that order.
 *
 * Both steps run in the worker because closing the panel tears down the
 * panel's own document: a page that disables itself can't be relied on to
 * finish the rest of the job. The order matters too — disabling the panel
 * while it is still showing this tab is what actually closes it (the same
 * path the Discard button takes). Creating the tab first instead activates a
 * tab where `side_panel.default_path` re-shows the panel.
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    if (typeof chrome.sidePanel !== "undefined") {
      const panelTabId: number | undefined =
        req.body?.tabId ??
        (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]
          ?.id
      if (panelTabId !== undefined) {
        // The context-menu handler re-enables the panel for the tab on the
        // next use, so disabling it here isn't permanent.
        await chrome.sidePanel.setOptions({
          tabId: panelTabId,
          enabled: false
        })
      }
    }

    await chrome.tabs.create({
      url: chrome.runtime.getURL("options.html#/applications")
    })

    res.send({ success: true })
  } catch (error) {
    res.send({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not open the applications list"
    })
  }
}

export default handler

import type { RefObject } from "react"
import { useEffect } from "react"

/**
 * Focus management shared by the app's modal surfaces: move focus into the
 * dialog on open, hand it back to the opener on close, keep Tab inside the
 * panel, and dismiss on Escape.
 */
export function useModalFocusTrap(
  panelRef: RefObject<HTMLElement>,
  onDismiss: () => void,
  initialFocusRef?: RefObject<HTMLElement>
) {
  // Move focus into the dialog on open and hand it back to whatever had it
  // on close. Mount-only: re-running would re-record the opener as the
  // dialog's own button and restore focus to a node that is already gone.
  useEffect(() => {
    const opener = document.activeElement
    initialFocusRef?.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss()
        return
      }
      if (event.key !== "Tab") return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      // Wrap at both ends, and pull focus back in if it escaped the dialog.
      if (
        event.shiftKey &&
        (active === first || !panelRef.current?.contains(active))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (active === last || !panelRef.current?.contains(active))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onDismiss, panelRef])
}

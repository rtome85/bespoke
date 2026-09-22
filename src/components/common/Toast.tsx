import { Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface Props {
  message: string
  /** How long the toast stays fully visible, in ms. */
  duration?: number
  onDismiss: () => void
}

const FADE_MS = 300

/**
 * Self-dismissing confirmation. Portalled to <body> for the same reason as
 * ConfirmDialog: the panels that raise it are `overflow-hidden` + translated,
 * which would clip a fixed element to the panel box.
 *
 * The timers run once per mount, so re-announcing the same message means
 * remounting — give the element a changing `key` rather than resetting props.
 */
export function Toast({ message, duration = 3_000, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)
  // Kept in a ref so an inline `onDismiss` arrow from the caller can't restart
  // the timers on every parent render.
  const dismissRef = useRef(onDismiss)

  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    // Mount transparent, then flip on the next frame so the fade-in runs.
    const frame = requestAnimationFrame(() => setVisible(true))
    const fadeOut = setTimeout(() => setVisible(false), duration)
    const dismiss = setTimeout(() => dismissRef.current(), duration + FADE_MS)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(fadeOut)
      clearTimeout(dismiss)
    }
  }, [duration])

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`aa-toast font-aa ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-aa-2"
      }`}>
      <Check size={15} className="shrink-0 text-aa-success-strong" />
      {message}
    </div>,
    document.body
  )
}

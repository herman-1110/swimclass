import { useEffect, useState } from 'react'

/**
 * Moves focus to a control by its id once the next render is on screen, so a screen reader
 * reads it with its new state (aria-invalid, its message). The control goes to the middle of
 * the screen: on phones the Save bar, taller with its message, and the tab bar cover the
 * bottom. Asking for the same id twice focuses it twice.
 */
export function useFocusRequest(): (id: string) => void {
  // A new object each time, so the same control can be focused twice in a row.
  const [request, setRequest] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const control = request && document.getElementById(request.id)
    if (!control) return
    control.focus({ preventScroll: true })
    // jsdom has no scrollIntoView.
    control.scrollIntoView?.({ block: 'center' })
  }, [request])

  return (id) => setRequest({ id })
}

import { type FocusEvent, useEffect, useRef } from 'react'

/**
 * Keeps focus from falling to the page when the control that had it leaves: a list that
 * refreshes and drops the row whose button was focused (My classes after "no longer
 * booked"), or a button that goes with the last lesson of a list.
 *
 * Spread the returned handlers on the block. After each render, if the last element focused
 * inside it has left the page and nothing has focus, `target()` gets it (a heading or a line
 * with tabIndex={-1}). Focus moved to another element outside the block is left alone.
 */
export function useFocusFallback(target: () => HTMLElement | null) {
  const last = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const focused = document.activeElement
    const lost = focused === null || focused === document.body
    if (lost && last.current && !last.current.isConnected) {
      last.current = null
      target()?.focus()
    }
  })

  return {
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.target instanceof HTMLElement) last.current = event.target
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      // To another element outside the block. A removed element's blur (Chrome sends one)
      // has no relatedTarget, so it keeps its place here.
      const to = event.relatedTarget
      if (to instanceof Node && !event.currentTarget.contains(to)) last.current = null
    },
  }
}

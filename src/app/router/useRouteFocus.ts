import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** How long to wait for the new page's h1 (a page's code or first read can still be loading). */
const WAIT_MS = 3000

/** Nothing has focus, or the tab bar or sidebar link that was used still has it. */
function focusIsLost(): boolean {
  const focused = document.activeElement
  return focused === null || focused === document.body || focused.closest('nav') !== null
}

/**
 * After a move to another page (not the first load, not a change of the search part only):
 * focus goes to the new page's h1, so a screen reader names the page and Tab goes on from
 * the top of its content. Only when focus would otherwise be lost: on <body> (the link that
 * was used left with the old page) or still on the tab bar or sidebar link. A page that
 * moved focus itself (a dialog, Students' Record payment panel) keeps it. The h1 is made
 * focusable for this (tabIndex -1) and keeps the scroll position.
 */
export function useRouteFocus() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const started = performance.now()
    let frame = 0
    const tryFocus = () => {
      if (!focusIsLost()) return
      const heading = document.querySelector<HTMLElement>('main h1') ?? document.querySelector('h1')
      if (!heading) {
        if (performance.now() - started < WAIT_MS) frame = requestAnimationFrame(tryFocus)
        return
      }
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    frame = requestAnimationFrame(tryFocus)
    return () => cancelAnimationFrame(frame)
  }, [pathname])
}

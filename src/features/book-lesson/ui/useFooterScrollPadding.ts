import { type RefObject, useEffect } from 'react'

// The tab bar's height below 1024 px: 57 px plus its bottom padding (TabBar.tsx; the same
// calc StickyBar uses).
const TAB_BAR = 'calc(57px + max(16px, env(safe-area-inset-bottom)))'

/**
 * Keeps keyboard focus clear of the bars stuck to the bottom of the screen (WCAG 2.2
 * 2.4.11; book spec §2.6 item 5): while the summary is mounted, the page's
 * scroll-padding-bottom is the tab bar plus the summary's own height on phones, the tab bar
 * alone from 768 px, and nothing from 1024 px (no tab bar). A chip that takes focus then
 * scrolls into view above them instead of behind them.
 */
export function useFooterScrollPadding(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver !== 'function' || typeof matchMedia !== 'function') {
      return
    }
    const root = document.documentElement.style
    const tablet = matchMedia('(min-width: 48rem)')
    const computer = matchMedia('(min-width: 64rem)')
    const update = () => {
      if (computer.matches) root.removeProperty('scroll-padding-bottom')
      else if (tablet.matches) root.setProperty('scroll-padding-bottom', TAB_BAR)
      else root.setProperty('scroll-padding-bottom', `calc(${TAB_BAR} + ${element.offsetHeight}px)`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    tablet.addEventListener('change', update)
    computer.addEventListener('change', update)
    return () => {
      observer.disconnect()
      tablet.removeEventListener('change', update)
      computer.removeEventListener('change', update)
      root.removeProperty('scroll-padding-bottom')
    }
  }, [ref])
}

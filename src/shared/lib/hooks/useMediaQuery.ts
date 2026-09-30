import { useCallback, useSyncExternalStore } from 'react'

function matches(query: string): boolean {
  // jsdom (the unit tests) has no matchMedia: treat every query as not matching.
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

/**
 * Whether a CSS media query matches, kept up to date as the window changes, e.g.
 * `useMediaQuery('(min-width: 1280px)')`.
 *
 * Only for behaviour CSS can't change, such as whether SidePanel is a modal or a plain
 * column (ARCHITECTURE §3.7). Layout changes use the md:, lg: and xl: classes instead.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => matches(query))
}

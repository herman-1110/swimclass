import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

/** One destination in a layout's tab bar and sidebar (DESIGN §3, Navigation). */
export type NavItem = {
  to: string
  label: string
  /** A shorter label for the tab bar, where the sidebar's doesn't fit ("Students"). */
  tabLabel?: string
  /** The tab bar's icon (TabIcon). The sidebar shows text only. */
  icon: ReactNode
  /** Other pages of the same section, so this item stays current there. */
  alsoOn?: string[]
}

/**
 * Returns a check for "is this item the current page?": its own page, a page below it,
 * or one of its `alsoOn` pages. Ignores case, as the routes do.
 */
export function useIsCurrent() {
  const pathname = useLocation().pathname.toLowerCase()
  const isOn = (path: string) => pathname === path || pathname.startsWith(`${path}/`)
  return ({ to, alsoOn = [] }: Pick<NavItem, 'to' | 'alsoOn'>) => isOn(to) || alsoOn.some(isOn)
}

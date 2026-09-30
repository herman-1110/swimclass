import type { ComponentPropsWithRef } from 'react'

import { cn } from '@/shared/lib/cn'

const paddings = {
  sm: 'py-3', // Settings' Save bar (design/AdminSettings.dc.html)
  md: 'flex flex-col gap-3 py-4', // Book's summary (design/Main.dc.html)
}

type StickyBarProps = ComponentPropsWithRef<'div'> & {
  /** sm: 12 px top and bottom (Save bar). md: 16 px, children 12 px apart (booking summary). */
  padding?: keyof typeof paddings
  /** md: shown on phones only (the Save bar; from 768 px Save sits in the header). */
  hideFrom?: 'md'
}

/**
 * A bar stuck to the bottom of a phone screen, just above the tab bar, running to the screen
 * edges (DESIGN §4, §5): white with a --line rule on top. Sticky, not fixed, so it keeps its
 * place at the end of the page and never covers the last content. Render it last in the
 * page's column. The tab bar is 57 px + max(16 px, safe area) tall (TabBar.tsx); from 1024 px
 * there is no tab bar.
 */
export function StickyBar({ padding = 'sm', hideFrom, className, ...rest }: StickyBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-[calc(57px_+_max(16px,env(safe-area-inset-bottom)))] z-[1] -mx-5 mt-auto border-t border-line bg-white px-5 lg:bottom-0',
        paddings[padding],
        hideFrom === 'md' && 'md:hidden',
        className,
      )}
      {...rest}
    />
  )
}

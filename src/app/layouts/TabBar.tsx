import { Link } from 'react-router'

import { cn } from '@/shared/lib/cn'

import { type NavItem, useIsCurrent } from './navigation'

type TabBarProps = {
  /** Names the navigation for screen readers: the same name as the sidebar's. */
  label: string
  items: NavItem[]
}

// Below 1024 px: icons with their labels, stuck to the bottom of the screen (DESIGN §3).
// It follows <main> in the page, so at the end of the page it sits below the last content;
// higher up it covers the bottom 73 px of the window, so index.css reserves that height
// (data-tab-bar) for anything scrolled into view, such as a control reached with Tab. The
// bottom padding clears the home bar on phones that have one (DESIGN §5).
export function TabBar({ label, items }: TabBarProps) {
  const isCurrent = useIsCurrent()

  return (
    <nav
      aria-label={label}
      data-tab-bar=""
      className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white px-2 pt-1 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {items.map((item) => {
        const current = isCurrent(item)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-small text-[0.6875rem] no-underline',
              current
                ? 'font-semibold text-accent hover:text-accent'
                : 'font-medium text-muted hover:text-ink',
            )}
          >
            {item.icon}
            <span>{item.tabLabel ?? item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

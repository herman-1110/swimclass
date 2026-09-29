import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { type NavItem, useIsCurrent } from './navigation'

type TabBarProps = {
  /** Names the navigation for screen readers: the same name as the sidebar's. */
  label: string
  items: NavItem[]
}

// Below 1024 px: icons with their labels, stuck to the bottom of the screen (DESIGN §3).
// It follows <main> in the page, so it never covers the last content; the bottom padding
// clears the home bar on phones that have one (DESIGN §5).
export function TabBar({ label, items }: TabBarProps) {
  const isCurrent = useIsCurrent()

  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white px-2 pt-1 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {items.map((item) => {
        const current = isCurrent(item)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={current ? 'page' : undefined}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-small text-[11px] no-underline ${
              current
                ? 'font-semibold text-accent hover:text-accent'
                : 'font-medium text-muted hover:text-ink'
            }`}
          >
            {item.icon}
            <span>{item.tabLabel ?? item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** A tab bar icon: 22 px, stroke 1.6, in the text colour. Draw it on a 24 px grid. */
export function TabIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

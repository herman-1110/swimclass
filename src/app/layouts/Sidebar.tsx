import { Link } from 'react-router'

import { LogOutButton } from '@/features/log-out'
import { cn } from '@/shared/lib/cn'

import { type NavItem, type SidebarLink, useIsCurrent } from './navigation'

type SidebarProps = {
  /** Names the navigation for screen readers: the same name as the tab bar's. */
  label: string
  /** At the top, in accent (the settings' business name). Empty while it loads. */
  businessName: string
  items: NavItem[]
  /** Links at the bottom, above "Signed in as …" (View as customer, Back to coach view). */
  bottomItems?: SidebarLink[]
  /** Adds "Log out" under the bottom links (the coach's; customers log out on Account). */
  logOut?: boolean
  /** The signed-in account's display name, for "Signed in as …" at the bottom. */
  signedInAs?: string
}

const linkBase = 'flex min-h-11 items-center rounded-small px-3 text-sm no-underline hover:text-ink'

// From 1024 px, in place of the tab bar: a 220 px column with the business name at the
// top, text links (the current one on --subtle) and "Signed in as …" at the bottom
// (DESIGN §3; the drawings' .side).
export function Sidebar({
  label,
  businessName,
  items,
  bottomItems = [],
  logOut = false,
  signedInAs,
}: SidebarProps) {
  const isCurrent = useIsCurrent()
  const hasBottomLinks = bottomItems.length > 0 || logOut

  return (
    <aside
      aria-label={`${label} navigation`}
      className="hidden w-[220px] shrink-0 flex-col gap-8 border-r border-line px-3.5 pt-7 pb-6 lg:flex"
    >
      {/* min-h keeps the line's height while the settings load, so nothing below moves. */}
      <div className="min-h-[1lh] px-3 text-body font-semibold text-accent">{businessName}</div>
      <nav aria-label={label} className="flex flex-col gap-0.5">
        {items.map((item) => {
          const current = isCurrent(item)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={current ? 'page' : undefined}
              className={cn(
                linkBase,
                current ? 'bg-subtle font-semibold text-ink' : 'font-medium text-muted',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      {(hasBottomLinks || signedInAs) && (
        <div className="mt-auto flex flex-col gap-0.5">
          {bottomItems.map((item) => (
            <Link key={item.to} to={item.to} className={cn(linkBase, 'text-muted')}>
              {item.label}
            </Link>
          ))}
          {logOut && <LogOutButton className={cn(linkBase, 'w-full text-left text-muted')} />}
          {signedInAs && (
            <span className={cn('px-3 text-small text-muted', hasBottomLinks && 'pt-2')}>
              Signed in as {signedInAs}
            </span>
          )}
        </div>
      )}
    </aside>
  )
}

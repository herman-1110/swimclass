import { Link } from 'react-router'

import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

import { type NavItem, useIsCurrent } from './navigation'

type SidebarProps = {
  /** Names the navigation for screen readers: the same name as the tab bar's. */
  label: string
  items: NavItem[]
  /** Links at the bottom, above "Signed in as …" (the coach's View as customer). */
  bottomItems?: NavItem[]
  /** Who is signed in, for the "Signed in as …" line at the bottom. */
  signedInAs?: string
}

const linkBase = 'flex min-h-11 items-center rounded-small px-3 text-sm no-underline hover:text-ink'

// From 1024 px, in place of the tab bar: a 220 px column with the business name at the
// top, text links (the current one on --subtle) and "Signed in as …" at the bottom
// (DESIGN §3).
export function Sidebar({ label, items, bottomItems = [], signedInAs }: SidebarProps) {
  const isCurrent = useIsCurrent()

  return (
    <aside
      aria-label={`${label} navigation`}
      className="hidden w-[220px] shrink-0 flex-col gap-8 border-r border-line px-3.5 pt-7 pb-6 lg:flex"
    >
      <div className="px-3 text-[15px] font-semibold text-accent">{DEFAULT_BUSINESS_NAME}</div>
      <nav aria-label={label} className="flex flex-col gap-0.5">
        {items.map((item) => {
          const current = isCurrent(item)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={current ? 'page' : undefined}
              className={`${linkBase} ${current ? 'bg-subtle font-semibold text-ink' : 'font-medium text-muted'}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      {(bottomItems.length > 0 || signedInAs) && (
        <div className="mt-auto flex flex-col gap-0.5">
          {bottomItems.map((item) => (
            <Link key={item.to} to={item.to} className={`${linkBase} text-muted`}>
              {item.label}
            </Link>
          ))}
          {signedInAs && (
            <span className={`px-3 text-small text-muted ${bottomItems.length > 0 ? 'pt-2' : ''}`}>
              Signed in as {signedInAs}
            </span>
          )}
        </div>
      )}
    </aside>
  )
}

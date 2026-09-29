import { Link, Outlet, useLocation } from 'react-router'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'

// Desktop-first (1280 px and up) with a text-only sidebar (design/AdminSchedule.dc.html).
// Below 768 px the sidebar becomes a bar across the top so the pages keep their width.

// `alsoOn`: other pages that belong to the same section, so its link stays current there.
const links: { to: string; label: string; alsoOn?: string[] }[] = [
  { to: ROUTES.coachSchedule, label: 'Schedule' },
  { to: ROUTES.coachStudents, label: 'Students & payments', alsoOn: [ROUTES.coachAddStudents] },
  { to: ROUTES.coachSettings, label: 'Settings' },
]

const linkBase = 'flex min-h-11 items-center rounded-small px-3 text-sm no-underline hover:text-ink'

export function CoachLayout() {
  const { pathname } = useLocation()
  const isCurrent = (link: (typeof links)[number]) =>
    pathname === link.to || pathname.startsWith(`${link.to}/`) || !!link.alsoOn?.includes(pathname)

  return (
    <div className="flex min-h-dvh flex-col bg-white md:flex-row">
      <a
        href="#main"
        // Styles only apply on focus: focus:not-sr-only resets padding, so plain px/py
        // classes would lose to it.
        className="sr-only font-semibold focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-small focus:border focus:border-field focus:bg-white focus:px-4"
      >
        Skip to main content
      </a>
      <aside className="flex shrink-0 flex-col gap-4 border-b border-line px-3.5 py-4 md:w-[220px] md:gap-8 md:border-r md:border-b-0 md:pt-7 md:pb-6">
        <div className="px-3 text-[15px] font-semibold text-accent">{DEFAULT_BUSINESS_NAME}</div>
        <nav aria-label="Coach" className="flex flex-wrap gap-0.5 md:flex-col">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={isCurrent(link) ? 'page' : undefined}
              className={`${linkBase} ${isCurrent(link) ? 'bg-subtle font-semibold text-ink' : 'font-medium text-muted'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-0.5 md:mt-auto md:flex-col md:items-stretch">
          <Link to={ROUTES.book} className={`${linkBase} text-muted`}>
            View as customer
          </Link>
          <span className="px-3 text-small text-muted md:pt-2">Signed in as Coach</span>
        </div>
      </aside>
      <main
        id="main"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col gap-5 px-5 pt-6 pb-7 md:px-8 md:pt-8"
      >
        <Outlet />
      </main>
    </div>
  )
}

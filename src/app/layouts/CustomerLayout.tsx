import { Outlet } from 'react-router'

import { ROUTES } from '@/shared/config/routes'

import type { NavItem } from './navigation'
import { Sidebar } from './Sidebar'
import { SkipLink } from './SkipLink'
import { TabBar, TabIcon } from './TabBar'

// Phone first (design/Main.dc.html, MainDesktop.dc.html): a bottom tab bar below 1024 px,
// a 220 px sidebar from 1024 px (DESIGN §3, §5). Each page sets its own maximum width
// (Book, Schedule and My classes stop at 1100 px).

const items: NavItem[] = [
  {
    to: ROUTES.book,
    label: 'Book',
    icon: (
      <TabIcon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
      </TabIcon>
    ),
  },
  {
    to: ROUTES.schedule,
    label: 'Schedule',
    icon: (
      <TabIcon>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M9 9v12M15 9v12" />
      </TabIcon>
    ),
  },
  {
    to: ROUTES.myClasses,
    label: 'My classes',
    icon: (
      <TabIcon>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </TabIcon>
    ),
  },
  {
    to: ROUTES.account,
    label: 'Account',
    icon: (
      <TabIcon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </TabIcon>
    ),
  },
]

export function CustomerLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <SkipLink />
      {/* "Signed in as …" needs the signed-in person's name: prompt 05 adds it. */}
      <Sidebar label="Main" items={items} />
      <main
        id="main"
        tabIndex={-1}
        // Side padding 20 px on phones, 32 px from 768 px, 48 px from 1024 px (DESIGN §2).
        className="flex min-w-0 flex-1 flex-col gap-6 px-5 pt-7 pb-5 md:p-8 lg:px-12 lg:py-10"
      >
        <Outlet />
      </main>
      <TabBar label="Main" items={items} />
    </div>
  )
}

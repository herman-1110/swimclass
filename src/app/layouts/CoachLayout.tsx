import { Outlet } from 'react-router'

import { ROUTES } from '@/shared/config/routes'

import type { NavItem } from './navigation'
import { Sidebar } from './Sidebar'
import { SkipLink } from './SkipLink'
import { TabBar, TabIcon } from './TabBar'

// Desktop first (1280 px and up, design/AdminSchedule.dc.html), but it works on a phone
// too (AdminSchedulePhone.dc.html): a 220 px sidebar from 1024 px, a bottom tab bar
// below it (DESIGN §3, §5).

const sections: NavItem[] = [
  {
    to: ROUTES.coachSchedule,
    label: 'Schedule',
    icon: (
      <TabIcon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </TabIcon>
    ),
  },
  {
    to: ROUTES.coachStudents,
    label: 'Students & payments',
    tabLabel: 'Students',
    // Add students belongs to this section.
    alsoOn: [ROUTES.coachAddStudents],
    icon: (
      <TabIcon>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
        <path d="M18 14a6.5 6.5 0 0 1 3.5 6" />
      </TabIcon>
    ),
  },
  {
    to: ROUTES.coachSettings,
    label: 'Settings',
    icon: (
      <TabIcon>
        <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
        <circle cx="15" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="17" cy="18" r="2" />
      </TabIcon>
    ),
  },
]

// The customer pages: at the bottom of the sidebar, the last tab in the tab bar.
const customerView: NavItem = {
  to: ROUTES.book,
  label: 'View as customer',
  tabLabel: 'Customer view',
  icon: (
    <TabIcon>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </TabIcon>
  ),
}

const tabs = [...sections, customerView]

export function CoachLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <SkipLink />
      <Sidebar label="Coach" items={sections} bottomItems={[customerView]} signedInAs="Coach" />
      <main
        id="main"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col gap-5 px-5 pt-6 pb-7 md:px-8 md:pt-8"
      >
        <Outlet />
      </main>
      <TabBar label="Coach" items={tabs} />
    </div>
  )
}

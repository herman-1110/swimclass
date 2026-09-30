import { Outlet } from 'react-router'

import { useMyProfile } from '@/entities/account'
import { ROUTES } from '@/shared/config/routes'
import { CalendarIcon } from '@/shared/ui/icons/CalendarIcon'
import { EyeIcon } from '@/shared/ui/icons/EyeIcon'
import { SlidersIcon } from '@/shared/ui/icons/SlidersIcon'
import { UsersIcon } from '@/shared/ui/icons/UsersIcon'

import type { NavItem } from './navigation'
import { Sidebar } from './Sidebar'
import { SkipLink } from './SkipLink'
import { TabBar } from './TabBar'
import { useBusinessName } from './useBusinessName'

// Desktop first (1280 px and up, design/AdminSchedule.dc.html), but it works on a phone
// too (AdminSchedulePhone.dc.html): a 220 px sidebar from 1024 px, a bottom tab bar
// below it (DESIGN §3, §5).

const sections: NavItem[] = [
  { to: ROUTES.coachSchedule, label: 'Schedule', icon: <CalendarIcon /> },
  {
    to: ROUTES.coachStudents,
    label: 'Students & payments',
    tabLabel: 'Students',
    // Add students belongs to this section.
    alsoOn: [ROUTES.coachAddStudents],
    icon: <UsersIcon />,
  },
  { to: ROUTES.coachSettings, label: 'Settings', icon: <SlidersIcon /> },
]

// The customer pages: at the bottom of the sidebar, the last tab in the tab bar.
const customerView: NavItem = {
  to: ROUTES.book,
  label: 'View as customer',
  tabLabel: 'Customer view',
  icon: <EyeIcon />,
}

const tabs = [...sections, customerView]

export function CoachLayout() {
  const profile = useMyProfile()
  const businessName = useBusinessName()

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <SkipLink />
      <Sidebar
        label="Coach"
        businessName={businessName}
        items={sections}
        bottomItems={[customerView]}
        // The coach's own way out (auth spec Q10); customers log out on Account.
        logOut
        signedInAs={profile.data?.display_name}
      />
      {/* No padding: each coach page pads its own content as drawn, because its side
          columns (Schedule's 320 px, Record payment's 340 px) run to the edges. */}
      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <TabBar label="Coach" items={tabs} />
    </div>
  )
}

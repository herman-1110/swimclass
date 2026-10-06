import { Outlet } from 'react-router'

import { useMyProfile } from '@/entities/account'
import { ROUTES } from '@/shared/config/routes'
import { CalendarPlusIcon } from '@/shared/ui/icons/CalendarPlusIcon'
import { ListIcon } from '@/shared/ui/icons/ListIcon'
import { TimetableIcon } from '@/shared/ui/icons/TimetableIcon'
import { UserIcon } from '@/shared/ui/icons/UserIcon'

import type { NavItem, SidebarLink } from './navigation'
import { Sidebar } from './Sidebar'
import { SkipLink } from './SkipLink'
import { TabBar } from './TabBar'
import { useBusinessName } from './useBusinessName'

// Phone first (design/Main.dc.html, MainDesktop.dc.html): a bottom tab bar below 1024 px,
// a 220 px sidebar from 1024 px (DESIGN §3, §5). Each page sets its own maximum width
// (Book, Schedule, My classes and, from 1280 px, Account stop at 1100 px, in the middle of
// the space beside the sidebar).

const items: NavItem[] = [
  { to: ROUTES.book, label: 'Book', icon: <CalendarPlusIcon /> },
  { to: ROUTES.schedule, label: 'Schedule', icon: <TimetableIcon /> },
  { to: ROUTES.myClasses, label: 'My classes', icon: <ListIcon /> },
  { to: ROUTES.account, label: 'Account', icon: <UserIcon /> },
]

// The coach looks at these pages through "View as customer"; this takes him back (auth
// spec §1.5, Q10). On phones he finds it on Account.
const backToCoachView: SidebarLink = { to: ROUTES.coachSchedule, label: 'Back to coach view' }

export function CustomerLayout() {
  const profile = useMyProfile()
  const businessName = useBusinessName()
  const isCoach = profile.data?.role === 'coach'

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <SkipLink />
      <Sidebar
        label="Main"
        businessName={businessName}
        items={items}
        bottomItems={isCoach ? [backToCoachView] : []}
        signedInAs={profile.data?.display_name}
      />
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

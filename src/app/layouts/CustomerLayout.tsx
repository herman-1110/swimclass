import { Outlet } from 'react-router'

import { useMyProfile } from '@/entities/account'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { cn } from '@/shared/lib/cn'
import { CalendarPlusIcon } from '@/shared/ui/icons/CalendarPlusIcon'
import { ListIcon } from '@/shared/ui/icons/ListIcon'
import { TimetableIcon } from '@/shared/ui/icons/TimetableIcon'
import { UserIcon } from '@/shared/ui/icons/UserIcon'
import { LanguageToggle } from '@/shared/ui/LanguageToggle'

import type { NavItem, SidebarLink } from './navigation'
import { Sidebar } from './Sidebar'
import { SkipLink } from './SkipLink'
import { TabBar } from './TabBar'
import { useBusinessName } from './useBusinessName'
import { type LayoutWords, layoutWords } from './words'

// Phone first (design/Main.dc.html, MainDesktop.dc.html): a bottom tab bar below 1024 px,
// a 220 px sidebar from 1024 px (DESIGN §3, §5). Each page sets its own maximum width
// (Book, Schedule, My classes and, from 1280 px, Account stop at 1100 px, in the middle of
// the space beside the sidebar).

function navItems(w: LayoutWords): NavItem[] {
  return [
    { to: ROUTES.book, label: w.book, icon: <CalendarPlusIcon /> },
    { to: ROUTES.schedule, label: w.schedule, icon: <TimetableIcon /> },
    { to: ROUTES.myClasses, label: w.myClasses, icon: <ListIcon /> },
    { to: ROUTES.account, label: w.account, icon: <UserIcon /> },
  ]
}

// The coach looks at these pages through "View as customer"; this takes him back (auth
// spec §1.5, Q10). On phones he finds it on Account.
function backToCoachView(w: LayoutWords): SidebarLink {
  return { to: ROUTES.coachSchedule, label: w.backToCoachView }
}

export function CustomerLayout() {
  const profile = useMyProfile()
  const businessName = useBusinessName()
  const isCoach = profile.data?.role === 'coach'
  const w = useWords(layoutWords)
  const items = navItems(w)

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <SkipLink />
      <Sidebar
        label={w.main}
        businessName={businessName}
        items={items}
        bottomItems={isCoach ? [backToCoachView(w)] : []}
        signedInAs={profile.data?.display_name}
      />
      <main
        id="main"
        tabIndex={-1}
        // Side padding 20 px on phones, 32 px from 768 px, 48 px from 1024 px (DESIGN §2).
        className="flex min-w-0 flex-1 flex-col gap-6 px-5 pt-7 pb-5 md:p-8 lg:px-12 lg:py-10"
      >
        {/* EN | 中文 at the top of every student page (Herman, 7 Oct 2026). In demo builds
            the Demo button sits in the phone's top right corner, so the toggle keeps clear. */}
        <div
          className={cn(
            '-mb-2 flex justify-end',
            import.meta.env.VITE_DEMO === 'true' && 'max-md:pe-14',
          )}
        >
          <LanguageToggle />
        </div>
        <Outlet />
      </main>
      <TabBar label={w.main} items={items} />
    </div>
  )
}

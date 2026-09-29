import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { ROUTES } from '@/shared/config/routes'

// Phone-first (390 px); on wider screens the app sits in a centred 480 px column
// (DESIGN §5). Tab bar from design/Main.dc.html.

type Tab = { to: string; label: string; icon: ReactNode }

const tabs: Tab[] = [
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
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white">
      <main className="flex flex-1 flex-col gap-6 px-5 pt-7 pb-5">
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="sticky bottom-0 grid grid-cols-4 border-t border-line bg-white px-2 pt-1 pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-small text-[11px] no-underline ${
                isActive
                  ? 'font-semibold text-accent hover:text-accent'
                  : 'font-medium text-muted hover:text-ink'
              }`
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function TabIcon({ children }: { children: ReactNode }) {
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

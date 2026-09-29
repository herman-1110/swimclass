import { Outlet } from 'react-router'

import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

// Log in, sign up, forgot and reset password, waiting for approval (design/Login.dc.html,
// LoginDesktop.dc.html): the whole screen on phones, with the page's last part pinned to
// the bottom (mt-auto); from 768 px a centred 420 px card on --subtle (DESIGN §5).
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh bg-white md:items-center md:justify-center md:bg-subtle md:p-10">
      <div className="flex flex-1 flex-col gap-10 bg-white px-7 pt-18 pb-10 md:w-full md:max-w-[420px] md:flex-none md:gap-8 md:rounded-2xl md:border md:border-frame md:p-10">
        <div className="text-sm font-semibold text-accent">{DEFAULT_BUSINESS_NAME}</div>
        <main className="flex flex-1 flex-col gap-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

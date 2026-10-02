import { Outlet } from 'react-router'

import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

type AuthLayoutProps = {
  /**
   * At the top of the card. Signed-out pages keep the default, since anon can't read the
   * settings; PendingLayout passes the settings' name. Empty keeps the line's height.
   */
  businessName?: string
}

// Log in, sign up, forgot and reset password, waiting for approval (design/Login.dc.html,
// LoginDesktop.dc.html): the whole screen on phones, with the page's last part pinned to
// the bottom (mt-auto); from 768 px a centred 420 px card on --subtle (DESIGN §5). The
// page's blocks (heading, form, foot) sit 40 px apart, 32 px from 768 px, as drawn.
export function AuthLayout({ businessName = DEFAULT_BUSINESS_NAME }: AuthLayoutProps) {
  return (
    // data-layout="card": the demo build's Demo button keeps clear of the card (DemoTools).
    <div
      data-layout="card"
      className="flex min-h-dvh bg-white md:items-center md:justify-center md:bg-subtle md:p-10"
    >
      <div className="flex flex-1 flex-col gap-10 bg-white px-7 pt-18 pb-10 md:w-full md:max-w-[420px] md:flex-none md:gap-8 md:rounded-2xl md:border md:border-frame md:p-10">
        <div className="min-h-[1lh] text-sm leading-[normal] font-semibold text-accent">
          {businessName}
        </div>
        <main className="flex flex-1 flex-col gap-10 md:gap-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

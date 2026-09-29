import { Outlet } from 'react-router'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

// Log in, sign up, forgot and reset password, waiting for approval: one phone column
// with the business name on top (design/Login.dc.html).
export function AuthLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-10 bg-white px-7 pt-18 pb-10">
      <div className="text-sm font-semibold text-accent">{DEFAULT_BUSINESS_NAME}</div>
      <main className="flex flex-1 flex-col gap-4">
        <Outlet />
      </main>
    </div>
  )
}

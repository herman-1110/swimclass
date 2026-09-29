import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '@/shared/config/routes'

// Route guards (TECH_SPEC §11). Stubs for now: every page is open so the skeleton can
// be clicked through. Prompt 05 fills them in from the Supabase session and profile:
//   RequireSignedIn  signed out → /login
//   RequireApproved  signed in, not approved → /pending (the only page they may see)
//   RequireCoach     customers can't open /coach/*
//   HomeRedirect     customers land on /book, the coach on /coach/schedule

export function RequireSignedIn() {
  return <Outlet />
}

export function RequireApproved() {
  return <Outlet />
}

export function RequireCoach() {
  return <Outlet />
}

export function HomeRedirect() {
  return <Navigate to={ROUTES.book} replace />
}

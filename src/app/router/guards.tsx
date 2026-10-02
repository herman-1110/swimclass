import { Navigate, Outlet, useLocation } from 'react-router'

import { useMyProfile, useSession } from '@/entities/account'
import { isLogOutRequest, LOG_OUT_REQUEST, LoggingOut } from '@/features/log-out'
import { ROUTES } from '@/shared/config/routes'

import { RouteLoading } from './RouteLoading'
import { safeFrom } from './safeFrom'

// Route guards (TECH_SPEC §11), in this order: signed in → approved → role.
// The database enforces every permission itself (CLAUDE.md rule 1); these only send
// people to the page they can use. Every redirect replaces the address (auth spec §1.4).
//
// The profile guards throw to the error screen only when there is no profile to route on
// (`isLoadingError`: the first read failed). A failed background read (refocus after the
// 30 s staleTime, a refresh after a change, /pending's poll) keeps TanStack's last good
// profile, so the guard keeps the page and anything typed in it; the next read recovers.

/** Signed out → /login, remembering where they were going. */
export function RequireSignedIn() {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <RouteLoading />
  if (session.status === 'signed-out') {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  return <Outlet />
}

/**
 * Log in, Sign up and Forgot password are for signed-out visitors. Anyone signed in goes
 * on: to where they were going before Log in, or home (auth spec §1.4). That also carries
 * a person on once they log in, or once an email's link signs them in on /login.
 * "Log out" opens Log in with LOG_OUT_REQUEST: the session ends here ("Logging out…"), and
 * the form shows once it has.
 */
export function RedirectIfSignedIn() {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <RouteLoading />
  const logOutRequested = isLogOutRequest(location.state)
  if (session.status === 'signed-in') {
    if (logOutRequested) return <LoggingOut />
    return <Navigate to={safeFrom(location.state) ?? ROUTES.home} replace />
  }
  // Signed out now: drop the request, so logging in again keeps the new session.
  if (logOutRequested) return <Navigate to={`${location.pathname}${location.search}`} replace />
  return <Outlet />
}

/**
 * A signed-in account whose profile row is gone (deleted meanwhile) is logged out and sees
 * Log in, not Waiting for approval (auth spec §1.4, proposed change 3).
 */
function LogOutMissingProfile() {
  return <Navigate to={ROUTES.login} replace state={LOG_OUT_REQUEST} />
}

/** Signed in but not approved yet → /pending, the only page they may see. */
export function RequireApproved() {
  const profile = useMyProfile()
  if (profile.isPending) return <RouteLoading />
  if (profile.isLoadingError) throw profile.error
  if (!profile.data) return <LogOutMissingProfile />
  if (!profile.data.approved) return <Navigate to={ROUTES.pending} replace />
  return <Outlet />
}

/** /pending is only for accounts still waiting for approval; the rest go home. */
export function RequirePending() {
  const profile = useMyProfile()
  if (profile.isPending) return <RouteLoading />
  if (profile.isLoadingError) throw profile.error
  if (!profile.data) return <LogOutMissingProfile />
  if (profile.data.approved) return <Navigate to={ROUTES.home} replace />
  return <Outlet />
}

/** Customers can't open /coach/*; they go to their own start page. */
export function RequireCoach() {
  const profile = useMyProfile()
  if (profile.isPending) return <RouteLoading />
  if (profile.isLoadingError) throw profile.error
  if (profile.data?.role !== 'coach') return <Navigate to={ROUTES.book} replace />
  return <Outlet />
}

/** Customers land on /book, the coach on /coach/schedule, anyone signed out on /login. */
export function HomeRedirect() {
  const session = useSession()
  const profile = useMyProfile()
  if (session.status === 'loading') return <RouteLoading />
  if (session.status === 'signed-out') return <Navigate to={ROUTES.login} replace />
  if (profile.isPending) return <RouteLoading />
  if (profile.isLoadingError) throw profile.error
  if (!profile.data) return <LogOutMissingProfile />
  if (!profile.data.approved) return <Navigate to={ROUTES.pending} replace />
  return (
    <Navigate to={profile.data.role === 'coach' ? ROUTES.coachSchedule : ROUTES.book} replace />
  )
}

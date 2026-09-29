import { Navigate, type RouteObject } from 'react-router'

import { AuthLayout } from '@/app/layouts/AuthLayout'
import { CoachLayout } from '@/app/layouts/CoachLayout'
import { CustomerLayout } from '@/app/layouts/CustomerLayout'
import { RootLayout } from '@/app/layouts/RootLayout'
import { AccountPage } from '@/pages/account'
import { BookPage } from '@/pages/book'
import { ForgotPasswordPage } from '@/pages/forgot-password'
import { LoginPage } from '@/pages/login'
import { MyClassesPage } from '@/pages/my-classes'
import { NotFoundPage } from '@/pages/not-found'
import { PendingPage } from '@/pages/pending'
import { ResetPasswordPage } from '@/pages/reset-password'
import { SchedulePage } from '@/pages/schedule'
import { SignUpPage } from '@/pages/signup'
import { ROUTES } from '@/shared/config/routes'

import { HomeRedirect, RequireApproved, RequireCoach, RequireSignedIn } from './guards'
import { RouteError } from './RouteError'
import { RouteLoading } from './RouteLoading'

/**
 * Every route (ARCHITECTURE §3.5; paths from ROUTES). Guards run in order: signed in → approved → role.
 * Customer pages are bundled up front (phones on 4G); the coach's pages are loaded on
 * demand so customers never download them.
 *
 * A function, not a constant, so every router (the app's one, and one per test) gets its
 * own route objects: React Router writes to some route objects it is given, so sharing
 * them between routers can leak one router's state into another.
 */
export function createRoutes(): RouteObject[] {
  return [
    {
      Component: RootLayout,
      ErrorBoundary: RouteError,
      HydrateFallback: RouteLoading,
      children: [
        { index: true, Component: HomeRedirect },

        // Signed out
        {
          Component: AuthLayout,
          children: [
            { path: ROUTES.login, Component: LoginPage },
            { path: ROUTES.signup, Component: SignUpPage },
            { path: ROUTES.forgotPassword, Component: ForgotPasswordPage },
            { path: ROUTES.resetPassword, Component: ResetPasswordPage },
          ],
        },

        {
          Component: RequireSignedIn,
          children: [
            // Signed in, not approved yet: this is the only page they can see
            {
              Component: AuthLayout,
              children: [{ path: ROUTES.pending, Component: PendingPage }],
            },

            {
              Component: RequireApproved,
              children: [
                // Customers (the coach can open these through "View as customer")
                {
                  Component: CustomerLayout,
                  children: [
                    { path: ROUTES.book, Component: BookPage },
                    { path: ROUTES.schedule, Component: SchedulePage },
                    { path: ROUTES.myClasses, Component: MyClassesPage },
                    { path: ROUTES.account, Component: AccountPage },
                  ],
                },

                // Coach only
                {
                  path: ROUTES.coach,
                  Component: RequireCoach,
                  children: [
                    {
                      Component: CoachLayout,
                      children: [
                        { index: true, element: <Navigate to={ROUTES.coachSchedule} replace /> },
                        // Use the function form of `lazy`. With the object form
                        // (`lazy: { Component }`) React Router 8 swallows a failed import
                        // (for example an old chunk after a redeploy) and shows a blank
                        // page; the function form sends it to RouteError.
                        {
                          path: ROUTES.coachSchedule,
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-schedule')).CoachSchedulePage,
                          }),
                        },
                        {
                          path: ROUTES.coachStudents,
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-students')).CoachStudentsPage,
                          }),
                        },
                        {
                          path: ROUTES.coachAddStudents,
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-add-students'))
                              .CoachAddStudentsPage,
                          }),
                        },
                        {
                          path: ROUTES.coachSettings,
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-settings')).CoachSettingsPage,
                          }),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        { path: '*', Component: NotFoundPage },
      ],
    },
  ]
}

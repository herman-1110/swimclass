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
import { HomeRedirect, RequireApproved, RequireCoach, RequireSignedIn } from './guards'
import { RouteError } from './RouteError'
import { RouteLoading } from './RouteLoading'

/**
 * Every route in TECH_SPEC §11. Guards run in order: signed in → approved → role.
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
            { path: 'login', Component: LoginPage },
            { path: 'signup', Component: SignUpPage },
            { path: 'forgot', Component: ForgotPasswordPage },
            { path: 'reset', Component: ResetPasswordPage },
          ],
        },

        {
          Component: RequireSignedIn,
          children: [
            // Signed in, not approved yet: this is the only page they can see
            {
              Component: AuthLayout,
              children: [{ path: 'pending', Component: PendingPage }],
            },

            {
              Component: RequireApproved,
              children: [
                // Customers (the coach can open these through "View as customer")
                {
                  Component: CustomerLayout,
                  children: [
                    { path: 'book', Component: BookPage },
                    { path: 'schedule', Component: SchedulePage },
                    { path: 'classes', Component: MyClassesPage },
                    { path: 'account', Component: AccountPage },
                  ],
                },

                // Coach only
                {
                  path: 'coach',
                  Component: RequireCoach,
                  children: [
                    {
                      Component: CoachLayout,
                      children: [
                        { index: true, element: <Navigate to="/coach/schedule" replace /> },
                        // Use the function form of `lazy`. With the object form
                        // (`lazy: { Component }`) React Router 8 swallows a failed import
                        // (for example an old chunk after a redeploy) and shows a blank
                        // page; the function form sends it to RouteError.
                        {
                          path: 'schedule',
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-schedule')).CoachSchedulePage,
                          }),
                        },
                        {
                          path: 'students',
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-students')).CoachStudentsPage,
                          }),
                        },
                        {
                          path: 'students/new',
                          lazy: async () => ({
                            Component: (await import('@/pages/coach-add-students'))
                              .CoachAddStudentsPage,
                          }),
                        },
                        {
                          path: 'settings',
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

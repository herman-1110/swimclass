import { Navigate, type RouteObject } from 'react-router'
import { ForgotPasswordPage } from '../features/auth/forgot-password/ForgotPasswordPage'
import { LoginPage } from '../features/auth/login/LoginPage'
import { ResetPasswordPage } from '../features/auth/reset-password/ResetPasswordPage'
import { SignUpPage } from '../features/auth/sign-up/SignUpPage'
import { WaitingForApprovalPage } from '../features/auth/waiting-for-approval/WaitingForApprovalPage'
import { AccountPage } from '../features/customer/account/AccountPage'
import { BookPage } from '../features/customer/book/BookPage'
import { MyClassesPage } from '../features/customer/my-classes/MyClassesPage'
import { SchedulePage } from '../features/customer/schedule/SchedulePage'
import { HomeRedirect, RequireApproved, RequireCoach, RequireSignedIn } from './guards'
import { AuthLayout } from './layouts/AuthLayout'
import { CoachLayout } from './layouts/CoachLayout'
import { CustomerLayout } from './layouts/CustomerLayout'
import { NotFoundPage } from './NotFoundPage'
import { RootLayout } from './RootLayout'
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
              children: [{ path: 'pending', Component: WaitingForApprovalPage }],
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
                            Component: (
                              await import('../features/coach/schedule/CoachSchedulePage')
                            ).CoachSchedulePage,
                          }),
                        },
                        {
                          path: 'students',
                          lazy: async () => ({
                            Component: (await import('../features/coach/students/StudentsPage'))
                              .StudentsPage,
                          }),
                        },
                        {
                          path: 'students/new',
                          lazy: async () => ({
                            Component: (
                              await import('../features/coach/add-students/AddStudentsPage')
                            ).AddStudentsPage,
                          }),
                        },
                        {
                          path: 'settings',
                          lazy: async () => ({
                            Component: (await import('../features/coach/settings/SettingsPage'))
                              .SettingsPage,
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

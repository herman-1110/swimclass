/**
 * Every path in the app, written once (ARCHITECTURE §3.5): the router, the navigation
 * and every link use these. A page's folder is its path with `/` turned into `-`.
 * Emails link to /my-classes, /book and /coach/schedule from the database
 * (supabase/migrations), so change those there too.
 */
export const ROUTES = {
  home: '/',
  // Anyone
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  // Signed in, not approved yet
  pending: '/pending',
  // Customers (the coach can look)
  book: '/book',
  schedule: '/schedule',
  myClasses: '/my-classes',
  account: '/account',
  // Coach
  coach: '/coach',
  coachSchedule: '/coach/schedule',
  coachStudents: '/coach/students',
  coachAddStudents: '/coach/add-students',
  coachSettings: '/coach/settings',
} as const

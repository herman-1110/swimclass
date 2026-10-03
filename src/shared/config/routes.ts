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

/**
 * The search params Students & payments reads (coach-students §1): the filter tab, the group
 * in the Record payment panel, the group whose History is open, and a group just added.
 * Written once, for the links below and for the page that reads them.
 */
export const STUDENTS_PARAMS = {
  filter: 'filter',
  pay: 'pay',
  history: 'history',
  added: 'added',
} as const

/** Students & payments with one search param set to a group's id. */
function coachStudentsWith(
  param: (typeof STUDENTS_PARAMS)[keyof typeof STUDENTS_PARAMS],
  groupId: string,
) {
  return `${ROUTES.coachStudents}?${new URLSearchParams({ [param]: groupId }).toString()}`
}

/**
 * Students & payments with one group's Record payment panel open (`?pay=<group id>`):
 * where the coach Schedule's Needs attention sends "Record payment" (prompt 09 DIAGNOSE 3).
 */
export function coachStudentsPay(groupId: string): string {
  return coachStudentsWith(STUDENTS_PARAMS.pay, groupId)
}

/**
 * Students & payments with one group's History open (`?history=<group id>`): the "that
 * group" links of Add students' and Reactivate's refusals (DESIGN §6).
 */
export function coachStudentsHistory(groupId: string): string {
  return coachStudentsWith(STUDENTS_PARAMS.history, groupId)
}

/**
 * Add students with one account chosen (`?account=<account id>`): Needs attention's "Add
 * students" for an account with no group yet.
 */
export function coachAddStudentsFor(accountId: string): string {
  return `${ROUTES.coachAddStudents}?${new URLSearchParams({ account: accountId }).toString()}`
}

/**
 * Students & payments after Add students (`?added=<group id>`): the new group's row is
 * highlighted, with "3 students added" (coach-add-students §5.2.1).
 */
export function coachStudentsAdded(groupId: string): string {
  return coachStudentsWith(STUDENTS_PARAMS.added, groupId)
}

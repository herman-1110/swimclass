/**
 * Router state that asks Log in to end the session before it shows the form. "Log out" is a
 * navigation first, so a page's leave guard (React Router's useBlocker) can keep the person on
 * the page before anything is lost; the session ends only once Log in opens (LoggingOut).
 */
export const LOG_OUT_REQUEST = { logOut: true } as const

/** Whether router state carries LOG_OUT_REQUEST. */
export function isLogOutRequest(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'logOut' in state && state.logOut === true
}

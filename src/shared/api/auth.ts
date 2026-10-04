import { ROUTES } from '@/shared/config/routes'

import { getBackend } from './backend'
import { toAppError } from './rpc'

// Signing in and out (TECH_SPEC §7, §9). Like rpc.ts, the only door: Supabase Auth
// behind it, or demo mode's accounts. Every failure comes out as an AppError.

/** Who is signed in: the account id (`profiles.id`) and their email. */
export type AuthSession = { userId: string; email: string | null }

/** What sign-up sends; the profile trigger reads username, display name and phone. */
export type SignUpInput = {
  username: string
  displayName: string
  email: string
  phone: string | null
  password: string
  /** The CAPTCHA's token when it is on (TECH_SPEC §9); Auth checks it. */
  captchaToken?: string | null
}

async function run<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw toAppError(error)
  }
}

/** The page emails link back to, on whichever site sent them (production or localhost). */
function linkTo(path: string): string {
  return `${window.location.origin}${path}`
}

export function getSession(): Promise<AuthSession | null> {
  return run(async () => (await getBackend()).auth.getSession())
}

/** Calls the listener after every sign-in and sign-out; returns a function that stops it. */
export function onSessionChange(listener: (session: AuthSession | null) => void): () => void {
  let stop: (() => void) | undefined
  let stopped = false
  void getBackend().then((backend) => {
    if (!stopped) stop = backend.auth.onChange(listener)
  })
  return () => {
    stopped = true
    stop?.()
  }
}

/**
 * Username and password, through the `login` Edge Function (`invalid_login`,
 * `too_many_attempts`, `captcha_failed`), with the CAPTCHA's token when it is on.
 */
export function logIn(
  username: string,
  password: string,
  captchaToken: string | null = null,
): Promise<AuthSession> {
  return run(async () => (await getBackend()).auth.logIn(username, password, captchaToken))
}

/**
 * Creates an account waiting for the coach's approval. `confirmEmail` is true when
 * Supabase sent a confirmation email first.
 */
export function signUp(input: SignUpInput): Promise<{ confirmEmail: boolean }> {
  return run(async () => (await getBackend()).auth.signUp(input, linkTo(ROUTES.login)))
}

/** Ends the session on this device only; the account's other devices stay signed in. */
export function logOut(): Promise<void> {
  return run(async () => (await getBackend()).auth.logOut())
}

/** Emails a link to /reset-password; with the CAPTCHA's token when it is on. */
export function sendPasswordReset(
  email: string,
  captchaToken: string | null = null,
): Promise<void> {
  return run(async () =>
    (await getBackend()).auth.sendPasswordReset(email, linkTo(ROUTES.resetPassword), captchaToken),
  )
}

/** The signed-in account's new password (also the last step of a reset). */
export function updatePassword(password: string): Promise<void> {
  return run(async () => (await getBackend()).auth.updatePassword(password))
}

import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

/** The change-password fields. */
export type PasswordField = 'password' | 'confirm'

/** A messages.ts code for each field that has a problem. */
export type PasswordProblems = Partial<Record<PasswordField, string>>

/**
 * Account's change-password checks before any call (auth spec §6.6, W5): at least
 * MIN_PASSWORD_LENGTH characters, typed the same twice.
 */
export function passwordProblems(password: string, confirm: string): PasswordProblems {
  const problems: PasswordProblems = {}
  if (password.length < MIN_PASSWORD_LENGTH) problems.password = 'weak_password'
  if (confirm !== password) problems.confirm = 'password_mismatch'
  return problems
}

/**
 * Refusals that belong under New password (a weak or unchanged password). The rest show
 * above the button: a missing session, too, gets the generic words (auth spec W5).
 */
export function isPasswordRefusal(code: string): boolean {
  return code === 'weak_password' || code === 'same_password'
}

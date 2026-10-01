import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

// Something@something.something, with no spaces: enough to catch a typo before asking for
// the email (Supabase Auth checks addresses again).
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Forgot password's check before any call (auth spec §6.3): an email address, trimmed. A
 * messages.ts code, or null when it looks right.
 */
export function emailProblem(email: string): 'email_address_invalid' | null {
  return EMAIL_SHAPE.test(email.trim()) ? null : 'email_address_invalid'
}

/** The new-password fields. */
export type NewPasswordField = 'password' | 'confirm'

/** A messages.ts code for each field that has a problem. */
export type NewPasswordProblems = Partial<Record<NewPasswordField, string>>

/**
 * Set a new password's checks before any call (auth spec §6.4): at least
 * MIN_PASSWORD_LENGTH characters, typed the same twice.
 */
export function newPasswordProblems(password: string, confirm: string): NewPasswordProblems {
  const problems: NewPasswordProblems = {}
  if (password.length < MIN_PASSWORD_LENGTH) problems.password = 'weak_password'
  if (confirm !== password) problems.confirm = 'password_mismatch'
  return problems
}

/** Refusals that belong under New password; the rest go above the button. */
export function isNewPasswordRefusal(code: string): boolean {
  return code === 'weak_password' || code === 'same_password'
}

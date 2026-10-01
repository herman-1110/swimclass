import { isValidUsername, normalizeUsername, type UsernameCheckState } from '@/entities/account'
import type { SignUpInput } from '@/shared/api/auth'
import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

/** What the sign-up form holds, as typed. */
export type SignUpValues = {
  username: string
  name: string
  email: string
  phone: string
  password: string
  confirm: string
}

export type SignUpField = keyof SignUpValues

/** The fields in focus order (auth spec §7.1): the first with a problem gets focus. */
export const SIGN_UP_FIELDS = [
  'username',
  'name',
  'email',
  'phone',
  'password',
  'confirm',
] as const satisfies readonly SignUpField[]

/** A messages.ts code for each field that has a problem. */
export type SignUpProblems = Partial<Record<SignUpField, string>>

export const EMPTY_SIGN_UP: SignUpValues = {
  username: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirm: '',
}

// Something@something.something, with no spaces: enough to catch a typo before the email
// goes out (the demo doesn't check addresses; Supabase Auth checks them again).
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Whether trimmed text looks like an email address ("name@example.com"). */
export function isEmailAddress(text: string): boolean {
  return EMAIL_SHAPE.test(text)
}

/**
 * The checks before signUp (auth spec W2, §5.4): the username's format and, when the live
 * check has answered, that it is free; a name; an email address; a password of at least
 * MIN_PASSWORD_LENGTH characters, typed twice. The phone is optional (open question 3; the
 * database allows none), and maxLength keeps the name and phone within the database's limits.
 */
export function signUpProblems(
  values: SignUpValues,
  usernameState?: UsernameCheckState,
): SignUpProblems {
  const problems: SignUpProblems = {}
  if (!isValidUsername(normalizeUsername(values.username))) problems.username = 'invalid_username'
  else if (usernameState === 'taken') problems.username = 'username_taken'
  if (values.name.trim() === '') problems.name = 'name_required'
  if (!isEmailAddress(values.email.trim())) problems.email = 'email_address_invalid'
  if (values.password.length < MIN_PASSWORD_LENGTH) problems.password = 'weak_password'
  if (values.confirm !== values.password) problems.confirm = 'password_mismatch'
  return problems
}

/**
 * What signUp sends (auth spec W2): the username as the database stores it, the name and
 * email trimmed, and the phone trimmed or null. The password goes as typed.
 */
export function signUpInput(values: SignUpValues): SignUpInput {
  return {
    username: normalizeUsername(values.username),
    displayName: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || null,
    password: values.password,
  }
}

/**
 * The field a refusal from signUp belongs to (auth spec §6.2), or null for the line above
 * the button (rate limit, network, anything else).
 */
export function signUpFieldFor(code: string): SignUpField | null {
  switch (code) {
    case 'username_taken':
      return 'username'
    case 'email_address_invalid':
    case 'user_already_exists':
      return 'email'
    case 'weak_password':
      return 'password'
    default:
      return null
  }
}

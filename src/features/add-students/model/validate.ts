import { isValidUsername, normalizeUsername, type UsernameCheckState } from '@/entities/account'

import { readAmount } from './amount'
import type { ResolvedRow } from './students'
import { NEW_ACCOUNT, type NewAccountDraft, PAID_BY, type Problems } from './types'

/** The form as it stands when Add is pressed: what the checks below read. */
export type FormSnapshot = {
  /** The Account select: '' (none chosen), NEW_ACCOUNT, or a profile id. */
  account: string
  newAccount: NewAccountDraft
  /** The live check of the new account's username (useUsernameAvailable). */
  usernameState: UsernameCheckState
  /** The visible student rows, matched (resolveStudents). */
  rows: readonly ResolvedRow[]
  location: string
  paid: boolean
  /** The Amount field's text. */
  amount: string
  /** The chosen type's package price, or null while it isn't set. */
  priceCents: number | null
  method: string
}

// Characters as the database counts them (length() counts code points, not UTF-16 units).
function characters(text: string): number {
  return [...text.trim()].length
}

function between(text: string, min: number, max: number): boolean {
  const count = characters(text)
  return count >= min && count <= max
}

// Something@something.something: the Edge Function and Supabase Auth check it properly.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The checks the form runs before any call (the spec §5.3), each with the code whose words
 * messages.ts gives. They only shape the request and answer early: the database and the
 * Edge Function check everything again and have the final say. Every problem is found at
 * once, so the form can show them all and focus the first.
 */
export function validate(form: FormSnapshot): Problems {
  const problems: Problems = {}

  if (form.account === '') problems.account = { code: 'account_required' }

  if (form.account === NEW_ACCOUNT) {
    const { name, username, email, phone } = form.newAccount
    if (!between(name, 1, 100)) problems.newName = { code: 'invalid_display_name' }
    if (!isValidUsername(normalizeUsername(username))) {
      problems.newUsername = { code: 'invalid_username' }
    } else if (form.usernameState === 'taken') {
      problems.newUsername = { code: 'username_taken' }
    }
    if (!EMAIL.test(email.trim())) problems.newEmail = { code: 'invalid_email' }
    if (characters(phone) > 30) problems.newPhone = { code: 'invalid_phone' }
  }

  const picked = new Set<string>()
  for (const row of form.rows) {
    const index = row.index
    if (row.kind === 'existing') {
      // The same existing student twice: the database answers invalid_students {index}.
      if (picked.has(row.student.id)) {
        problems[`student-${index}`] = { code: 'invalid_students', detail: { index } }
      }
      picked.add(row.student.id)
    } else if (row.kind === 'empty' || !between(row.name, 1, 100)) {
      problems[`student-${index}`] = { code: 'invalid_name', detail: { index } }
    }
  }

  if (!between(form.location, 1, 100)) problems.location = { code: 'invalid_location' }

  if (form.paid) {
    const cents = readAmount(form.amount)
    if (cents === 'invalid') problems.amount = { code: 'amount_format' }
    else if (cents === null && form.priceCents === null) problems.amount = { code: 'price_not_set' }
    if (!PAID_BY.some((option) => option.value === form.method)) {
      problems.method = { code: 'invalid_method' }
    }
  }

  return problems
}

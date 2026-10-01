import type { PaymentMethod } from '@/entities/payment'

/**
 * How the first package was paid: the three ways the form offers, matching
 * `invalid_method`'s words (the spec C5). The enum also has `free` and `other`, which Add
 * students doesn't offer.
 */
export type PaidBy = Extract<PaymentMethod, 'cash' | 'transfer' | 'fpx'>

/** Paid by's choices, in the drawn order (AdminStudents.dc.html:291-298). */
export const PAID_BY: readonly { value: PaidBy; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'fpx', label: 'FPX' },
]

/** The Account select's value for "Create a new account…". Profile ids are uuids, so it
 *  never clashes with an account. */
export const NEW_ACCOUNT = 'new'

/** What the coach types for a new account (the spec §5.2.2). */
export type NewAccountDraft = {
  name: string
  username: string
  email: string
  phone: string
}

/** One student of the group as create_group takes it: an existing student, or a new name. */
export type StudentItem = { student_id: string } | { name: string }

/**
 * Where a problem shows, and which control takes focus (the spec §5.3, §5.4). `students` is
 * the line after the Students rows (`duplicate_group`); `form` is the line above the buttons.
 */
export type FieldKey =
  | 'account'
  | 'newName'
  | 'newUsername'
  | 'newEmail'
  | 'newPhone'
  | 'type'
  | `student-${number}`
  | 'students'
  | 'location'
  | 'amount'
  | 'method'
  | 'openingUsed'
  | 'form'

/**
 * A problem to show in words (messages.ts): an AppError from a call, or a form's own check
 * before any call, as `{ code, detail }`.
 */
export type Problem = {
  readonly code: string
  readonly detail?: Readonly<Record<string, unknown>>
}

export type Problems = Partial<Record<FieldKey, Problem>>

/** What the page learns once the group exists. */
export type AddedResult = {
  groupId: string
  /** 1, 2 or 3: "3 students added" on Students & payments. */
  size: number
  /** Set when this visit created the account: " · Invite sent to {email}". */
  invitedEmail?: string
}

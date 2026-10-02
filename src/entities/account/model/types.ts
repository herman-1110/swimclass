import type { Row } from '@/shared/api/rpc'

/** An account's profile (TECH_SPEC §3). The email stays in Auth, never in this row. */
export type Profile = Row<'profiles'>

/** A customer account as the coach sees it (a profiles row with role customer): approved or
 *  still waiting for approval. */
export type CustomerAccount = Profile

/**
 * An account waiting for approval (Needs attention on the schedule, Waiting for approval on
 * Students & payments). The planned `pending_accounts()` (prompt 09; data-contracts §3.1)
 * will add the email; until it exists the rows come from `profiles`, which has none, so
 * `email` and `email_confirmed` are null.
 */
export type PendingAccount = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'phone' | 'created_at'
> & {
  email: string | null
  /** Whether the address is confirmed; null while unknown. */
  email_confirmed: boolean | null
}

/**
 * The order of the waiting list:
 * - `signup`: oldest sign-up first, then by id (the Waiting for approval tab, the Students
 *   spec §5.1 R5);
 * - `name`: by display name, then username (the schedule's Needs attention, the Schedule
 *   spec §3.6: "within waiting: by name").
 */
export type PendingAccountOrder = 'signup' | 'name'

/** A student of an account (the students table): Add students matches typed names against
 *  them, and My classes lists them under the account's name. */
export type Student = Row<'students'>

/**
 * The order of an account's students:
 * - `added`: created_at, then id. Add students matches a typed name to the first student
 *   added with that name (its spec §5.3).
 * - `name`: alphabetical as people read names, then id (My classes, its spec R4).
 */
export type StudentOrder = 'added' | 'name'

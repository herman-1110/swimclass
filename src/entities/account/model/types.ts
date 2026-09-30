import type { Row } from '@/shared/api/rpc'

/** An account's profile (TECH_SPEC §3). The email stays in Auth, never in this row. */
export type Profile = Row<'profiles'>

export type Role = Profile['role']

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

/** A student of an account (the students table): Add students matches typed names against
 *  them, and My classes lists them under the account's name. */
export type Student = Row<'students'>

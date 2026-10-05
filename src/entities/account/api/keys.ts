/**
 * Query keys for accounts, so features can refresh them after a change (features refresh
 * `accountKeys.all`).
 */
export const accountKeys = {
  all: ['account'] as const,
  /** The signed-in account's own profile. */
  me: (userId: string | null) => [...accountKeys.all, 'me', userId] as const,
  /** Every customer profile the account may read: the coach's view of all of them. */
  customers: () => [...accountKeys.all, 'customers'] as const,
  /** The accounts waiting for approval, with their email (pending_accounts; the coach). */
  waiting: () => [...accountKeys.all, 'waiting'] as const,
  /** Every active student the account may read: the coach all, a customer their own. */
  students: () => [...accountKeys.all, 'students'] as const,
  /** Whether a username is free (username_available), per normalized username. */
  usernameAvailable: (username: string) =>
    [...accountKeys.all, 'username-available', username] as const,
}

/** Query keys for payments (ARCHITECTURE §3.6): features refresh them after a change. */
export const paymentKeys = {
  all: ['payment'] as const,
  /** The payments of some groups: an account's (My classes) or one group's (the coach's History). */
  groups: (groupIds: readonly string[] | null) =>
    [...paymentKeys.all, 'groups', groupIds ? [...groupIds].sort() : null] as const,
}

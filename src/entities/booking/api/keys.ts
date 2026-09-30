/** The same groups give the same key, whatever order the page lists them in. */
const sorted = (groupIds: readonly string[] | null) => (groupIds ? [...groupIds].sort() : null)

/** Query keys for lessons (bookings, booking_ledger) (ARCHITECTURE §3.6): features refresh them after a change. */
export const bookingKeys = {
  all: ['booking'] as const,
  /** An account's upcoming lessons, by the account's group ids (My classes). */
  upcoming: (groupIds: readonly string[] | null) =>
    [...bookingKeys.all, 'upcoming', sorted(groupIds)] as const,
  /** An account's past lessons, by the account's group ids (My classes' Past view). */
  past: (groupIds: readonly string[] | null) =>
    [...bookingKeys.all, 'past', sorted(groupIds)] as const,
  /** One group's latest lessons (the coach's History and excuse picker). */
  group: (groupId: string | null) => [...bookingKeys.all, 'group', groupId] as const,
}

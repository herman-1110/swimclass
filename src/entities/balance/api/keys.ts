/** Query keys for package balances (group_balance) (ARCHITECTURE §3.6): features refresh them after a change. */
export const balanceKeys = {
  all: ['balance'] as const,
  /** One account's groups (customer screens; the coach's "View as customer" too). */
  account: (accountId: string | null) => [...balanceKeys.all, 'account', accountId] as const,
  /** Every group (the coach's screens). */
  coach: () => [...balanceKeys.all, 'coach'] as const,
}

/** Query keys for student groups (group_details) (ARCHITECTURE §3.6): features refresh them after a change. */
export const groupKeys = {
  all: ['group'] as const,
  /**
   * One account's own groups, active or not (Book, My classes). Scoped by account because
   * RLS shows the coach every group (data-contracts §3.6).
   */
  mine: (accountId: string | null) => [...groupKeys.all, 'mine', accountId] as const,
  /** Every group, as the coach reads them (Students & payments, Add booking, Add students). */
  coach: () => [...groupKeys.all, 'coach'] as const,
}

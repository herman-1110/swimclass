import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { Payments } from '../model/types'
import { paymentKeys } from './keys'

/**
 * How many payments a list reads, newest first: years of payments, and well under the 1000
 * rows Supabase returns at most (data-contracts §2.3: history lists need a limit).
 */
export const PAYMENT_LIMIT = 200

/**
 * The latest `limit` payments of some groups, newest first (my-classes spec §5.1 R11;
 * coach-students R6). One more than the limit is read, which says whether older ones exist.
 * Exported for its test; pages use usePayments and useGroupPayments.
 */
export async function readPayments(
  groupIds: readonly string[],
  limit: number = PAYMENT_LIMIT,
): Promise<Payments> {
  if (groupIds.length === 0) return { payments: [], hasMore: false }
  const rows = await readRows('payments', {
    in: { group_id: groupIds },
    columns: [
      'id',
      'group_id',
      'lessons',
      'amount_cents',
      'method',
      'paid_on',
      'note',
      'created_at',
    ],
    order: [
      { column: 'paid_on', ascending: false },
      { column: 'created_at', ascending: false },
      { column: 'id', ascending: false },
    ],
    limit: limit + 1,
  })
  return { payments: rows.slice(0, limit), hasMore: rows.length > limit }
}

/**
 * The signed-in customer's latest PAYMENT_LIMIT payments, newest first, and whether older ones
 * exist (My classes' "Past lessons and receipts"): pass the ids of all the account's groups,
 * so the coach's "View as customer" stays empty (RLS would show him everyone's).
 * `enabled: false` waits (the Past view reads only while it is open), as do null ids; no
 * groups gives an empty list.
 */
export function usePayments(
  groupIds: readonly string[] | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: paymentKeys.groups(groupIds),
    queryFn: () => readPayments(groupIds ?? []),
    enabled: enabled && groupIds !== null,
  })
}

/**
 * One group's latest PAYMENT_LIMIT payments, newest first, and whether older ones exist, for
 * the coach's History. Waits while no group is chosen.
 */
export function useGroupPayments(groupId: string | null) {
  return usePayments(groupId === null ? null : [groupId])
}

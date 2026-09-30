import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { Payment } from '../model/types'
import { paymentKeys } from './keys'

/** The payments of some groups, newest first (my-classes spec §5.1 R11; coach-students R6). */
async function readPayments(groupIds: readonly string[]): Promise<Payment[]> {
  if (groupIds.length === 0) return []
  return readRows('payments', {
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
  })
}

/**
 * The payments of the signed-in customer's groups, newest first (My classes' "Past lessons and
 * receipts"): pass the ids of all the account's groups, so the coach's "View as customer"
 * stays empty (RLS would show him everyone's). `enabled: false` waits (the Past view reads
 * only while it is open), as do null ids; no groups gives an empty list.
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

/** One group's payments, newest first, for the coach's History. Waits while no group is chosen. */
export function useGroupPayments(groupId: string | null) {
  return usePayments(groupId === null ? null : [groupId])
}

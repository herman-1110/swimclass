import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { paymentKeys } from '@/entities/payment'
import { scheduleKeys } from '@/entities/schedule'
import { rpc } from '@/shared/api/rpc'

export type DeleteGroupInput = { groupId: string }

// What deleting a group changes: the groups and balances, its lessons and payments, the
// coach's week, and the students Add students offers (its new students go with it).
const CHANGED = [
  groupKeys.all,
  balanceKeys.all,
  bookingKeys.all,
  paymentKeys.all,
  scheduleKeys.all,
  accountKeys.students(),
]

type UseDeleteGroupOptions = {
  /**
   * Called as soon as the group is gone, before the refresh: the page closes History (its
   * group no longer exists) and says so. Here, not in mutate's options, so it still runs
   * when the dialog has gone.
   */
  onDeleted?: (input: DeleteGroupInput) => void
}

/**
 * `delete_group` (TECH_SPEC §5.3; the coach only; Herman, 9 Oct 2026): deletes a group added
 * by mistake, with its lessons, payments and starting balance; the account stays. Refused
 * with `group_has_upcoming_lessons` while it has lessons ahead, and `group_online_payment`.
 * Then it refreshes what that changes, and stays pending until the fresh data is in.
 */
export function useDeleteGroup({ onDeleted }: UseDeleteGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId }: DeleteGroupInput) => rpc('delete_group', { p_group_id: groupId }),
    onSuccess: async (_nothing, input) => {
      onDeleted?.(input)
      await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
  })
}

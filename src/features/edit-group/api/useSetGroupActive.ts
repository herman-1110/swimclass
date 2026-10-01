import { useMutation, useQueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { groupKeys } from '@/entities/group'
import { scheduleKeys } from '@/entities/schedule'
import { rpc } from '@/shared/api/rpc'

export type SetGroupActiveInput = { groupId: string; active: boolean }

// What pausing or resuming a group changes: the groups (every group picker, the customer's
// too) and the balances (data-contracts §8), and the coach's week (coach-students §5.3 W5).
const CHANGED = [groupKeys.all, balanceKeys.all, scheduleKeys.all]

type UseSetGroupActiveOptions = {
  /** Called as soon as the change is saved, before the refresh. */
  onChanged?: (input: SetGroupActiveInput) => void
}

/**
 * `set_group_active` (TECH_SPEC §5.3; the coach only): deactivate a group (refused with
 * `has_upcoming_lessons` while it has lessons ahead) or reactivate it (refused with
 * `duplicate_group` when another active group has the same students). Asking for the state
 * it already has does nothing. Then it refreshes what that changes, and stays pending until
 * the fresh data is in.
 */
export function useSetGroupActive({ onChanged }: UseSetGroupActiveOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, active }: SetGroupActiveInput) =>
      rpc('set_group_active', { p_group_id: groupId, p_active: active }),
    onSuccess: async (_nothing, input) => {
      onChanged?.(input)
      await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
  })
}

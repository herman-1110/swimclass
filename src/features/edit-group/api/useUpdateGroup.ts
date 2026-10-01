import { useMutation, useQueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { scheduleKeys } from '@/entities/schedule'
import { rpc } from '@/shared/api/rpc'

import type { UpdateGroupInput } from '../model/groupChanges'

// What editing a group changes (data-contracts §8): the groups, the balances (a starting
// balance moves the package numbers), the lessons (a new pool moves the upcoming ones) and
// the coach's week (lesson locations and package numbers).
const CHANGED = [groupKeys.all, balanceKeys.all, bookingKeys.all, scheduleKeys.all]

type UseUpdateGroupOptions = {
  /** Called as soon as the group is saved, before the refresh. */
  onSaved?: (input: UpdateGroupInput) => void
}

/**
 * `update_group` (TECH_SPEC §5.3; the coach only): a group's pool location and starting
 * balance. Left-out values are sent as nothing, so the database keeps them. A new location
 * also moves the group's upcoming lessons there. Then it refreshes what that changes, and
 * stays pending until the fresh data is in.
 */
export function useUpdateGroup({ onSaved }: UseUpdateGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, location, openingUsed, openingPaid }: UpdateGroupInput) =>
      rpc('update_group', {
        p_group_id: groupId,
        p_location: location,
        p_opening_used: openingUsed,
        p_opening_paid: openingPaid,
      }),
    onSuccess: async (_nothing, input) => {
      onSaved?.(input)
      await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
  })
}

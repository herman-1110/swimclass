import { skipToken, useQuery } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'
import type { DateKey } from '@/shared/lib/time'

import type { Slot } from '../model/types'
import { slotKeys } from './keys'

/**
 * Book's start times for a week (`week_slots`, TECH_SPEC §5.1): every start inside the
 * open hours of the 7 days from `weekStart` (a Monday) for a lesson of `minutes`, free or
 * crossed out with its reason, in start order (data-contracts §3.11).
 *
 * It reads nothing until all three are known: `week_slots` needs a group (the coach, who
 * has none of his own on "View as customer", would get `not_found`). Changing the week,
 * length or group shows no old chips under the new header: the data is undefined until the
 * new week answers (book.md §6.1). Errors: `not_approved`, `not_your_group`,
 * `invalid_length` (messageFor gives their words).
 */
export function useWeekSlots(
  weekStart: DateKey | null,
  minutes: number | null,
  groupId: string | null,
) {
  return useQuery({
    queryKey: slotKeys.week(weekStart, minutes, groupId),
    queryFn:
      weekStart === null || minutes === null || groupId === null
        ? skipToken
        : async (): Promise<Slot[]> =>
            (await rpc('week_slots', {
              p_week_start: weekStart,
              p_minutes: minutes,
              p_group_id: groupId,
            })) as Slot[],
  })
}

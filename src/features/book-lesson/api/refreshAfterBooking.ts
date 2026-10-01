import type { QueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { scheduleKeys } from '@/entities/schedule'
import { settingsKeys } from '@/entities/settings'
import { slotKeys } from '@/entities/slot'
import { toAppError } from '@/shared/api/rpc'

// What a booking changes (book spec §5.3.1; data-contracts §8; TECH_SPEC §11): the start
// times of every week, length and group (one lesson blocks them all), the week views, the
// package balances and My classes' lesson lists.
const CHANGED = [slotKeys.all, balanceKeys.all, scheduleKeys.all, bookingKeys.all]

/**
 * Refreshes what a booking changed, after a success or a refusal (a refusal usually means
 * the screen was out of date: someone booked the time first). Not after a network failure:
 * nothing changed, and the refresh would only fail again. `off_step` and `invalid_length`
 * mean the coach changed the settings, so they are read again too. After `group_inactive`
 * the groups are only marked stale: they refresh at the next window focus, so the picker
 * doesn't change under the message (book spec §5.3.1).
 */
export async function refreshAfterBooking(queryClient: QueryClient, error?: unknown) {
  const code = error === undefined ? null : toAppError(error).code
  if (code === 'network') return
  const keys =
    code === 'off_step' || code === 'invalid_length' ? [...CHANGED, settingsKeys.all] : CHANGED
  await Promise.all([
    ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    code === 'group_inactive' &&
      queryClient.invalidateQueries({ queryKey: groupKeys.all, refetchType: 'none' }),
  ])
}

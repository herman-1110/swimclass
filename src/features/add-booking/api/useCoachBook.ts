import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { rpc, toAppError } from '@/shared/api/rpc'

export type CoachBookInput = {
  groupId: string
  /** ISO string with an offset (`mytInstant(date, '19:30').toISOString()`). */
  startsAt: string
  /** From settings.lesson_lengths: 60 or 120. */
  minutes: number
  /** 1, or 2 to 52 with "Repeat weekly". */
  repeatWeeks: number
  /** "Outside open hours". */
  ignoreOpenHours: boolean
  /** "Skip travel gap". */
  gapOverride: boolean
  /** "Book anyway" after `credit_exceeded`. */
  ignoreCredit: boolean
}

// What a booking changes (data-contracts §8, TECH_SPEC §11): free start times, the week
// views (the neighbours' travel and every repeated week), package balances, lesson lists.
const CHANGED = [scheduleKeys.all, slotKeys.all, balanceKeys.all, bookingKeys.all]

// Refusals that mean the dialog was out of date: the group is gone or paused, or the first
// week's time stopped being free after the live check said it was.
const STALE_GROUPS = new Set(['group_inactive', 'not_found'])
const STALE_CHECK = new Set([
  'overlap_other',
  'gap_after',
  'gap_before',
  'outside_open_hours',
  'off_step',
])

async function refreshAfterBooking(queryClient: QueryClient): Promise<void> {
  await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

type UseCoachBookOptions = {
  /** Called as soon as the lessons are booked, before the refresh: close the dialog. */
  onBooked?: (bookingIds: string[], input: CoachBookInput) => void
}

/**
 * `coach_book` (TECH_SPEC §5.2; the coach only): any group, past dates (they count as used)
 * and dates beyond the booking window, with the coach's own options. It books every week or
 * none, and returns the new ids in start order. No email goes to the customer. Then it
 * refreshes what a booking changes and stays pending until the fresh data is in.
 *
 * After a clash it refreshes the live check (the week changed after it was checked), and
 * after `not_found` or `group_inactive` the groups (the group is gone or paused, §6.7).
 */
export function useCoachBook({ onBooked }: UseCoachBookOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CoachBookInput) =>
      rpc('coach_book', {
        p_group_id: input.groupId,
        p_starts_at: input.startsAt,
        p_minutes: input.minutes,
        p_repeat_weeks: input.repeatWeeks,
        p_ignore_open_hours: input.ignoreOpenHours,
        p_gap_override: input.gapOverride,
        p_ignore_credit: input.ignoreCredit,
      }),
    onSuccess: (bookingIds, input) => {
      onBooked?.(bookingIds, input)
      return refreshAfterBooking(queryClient)
    },
    onError: (error) => {
      const { code } = toAppError(error)
      if (STALE_GROUPS.has(code)) return queryClient.invalidateQueries({ queryKey: groupKeys.all })
      if (STALE_CHECK.has(code)) return queryClient.invalidateQueries({ queryKey: slotKeys.all })
    },
  })
}

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { rpc } from '@/shared/api/rpc'

// What an excused lesson changes (data-contracts §8): the package balances (it stops
// counting), the lesson lists, the week views, and the free start times (its time frees up).
const CHANGED = [balanceKeys.all, bookingKeys.all, scheduleKeys.all, slotKeys.all]

/** Refreshes everything excusing a lesson changes. */
export async function refreshAfterExcuse(queryClient: QueryClient): Promise<void> {
  await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/** refreshAfterExcuse for a component: after a refusal that means the list was out of date. */
export function useRefreshAfterExcuse(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => refreshAfterExcuse(queryClient)
}

export type ExcuseLessonInput = { bookingId: string }

type UseExcuseLessonOptions = {
  /** Called as soon as the lesson is excused, before the refresh: close the dialog or say
   *  "Lesson excused" there. It runs even if the component that asked has gone. */
  onExcused?: (input: ExcuseLessonInput) => void
}

/**
 * `excuse_booking` (TECH_SPEC §5.2; the coach only): a lesson that has started stops counting
 * (BR-18, BR-19). Then it refreshes what that changes, and stays pending until the fresh
 * data is in.
 */
export function useExcuseLesson({ onExcused }: UseExcuseLessonOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId }: ExcuseLessonInput) =>
      rpc('excuse_booking', { p_booking_id: bookingId }),
    onSuccess: (_nothing, input) => {
      onExcused?.(input)
      return refreshAfterExcuse(queryClient)
    },
  })
}

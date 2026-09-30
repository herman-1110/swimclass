import { useMutation, useQueryClient } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'

import { refreshLessons } from './refreshLessons'

export type CancelLessonInput = {
  bookingId: string
  /**
   * The coach's reason, up to 500 characters: it goes into the customer's email. Customers
   * never send one. The database trims it; a blank one is left out.
   */
  reason?: string
}

type UseCancelLessonOptions = {
  /**
   * Called as soon as the database has cancelled the lesson, before the refresh: close the
   * dialog and show the notice there (the My classes spec §5.3). It runs even if the row
   * that asked has gone by then, unlike `mutate`'s own callbacks.
   */
  onCancelled?: (input: CancelLessonInput) => void
}

/**
 * `cancel_booking` (TECH_SPEC §5.2): a customer's own lesson until the cutoff, or any lesson
 * for the coach. Then it refreshes what a cancellation changes (slot, schedule, balance,
 * booking and payment), and stays pending until the fresh data is in. After a refusal the
 * caller refreshes when the person has read it (`locked` and `not_booked` mean the screen
 * was out of date): the cancel confirmation does this when it closes.
 */
export function useCancelLesson({ onCancelled }: UseCancelLessonOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, reason }: CancelLessonInput) =>
      rpc('cancel_booking', { p_booking_id: bookingId, p_reason: reason?.trim() || undefined }),
    onSuccess: (_nothing, input) => {
      onCancelled?.(input)
      return refreshLessons(queryClient)
    },
  })
}

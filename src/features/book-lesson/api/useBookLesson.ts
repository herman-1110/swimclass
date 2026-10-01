import { useMutation, useQueryClient } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'

import { refreshAfterBooking } from './refreshAfterBooking'

export type BookLessonInput = {
  groupId: string
  /** The start exactly as week_slots gave it (UTC text with its offset). */
  startsAt: string
  /** The lesson's length: one of settings' lesson_lengths (60 or 120). */
  minutes: number
  /** 1 for one lesson; more books the same time that many weeks in a row, all or none (BR-13). */
  repeatWeeks: number
}

type UseBookLessonOptions<Input extends BookLessonInput> = {
  /**
   * Called as soon as the database has booked the lessons, before the refresh, with the new
   * booking ids in start order: show the success panel and forget the picked time, so the
   * refreshed chips never show the booked time as "isn’t available" first.
   */
  onBooked?: (bookingIds: string[], input: Input) => void
  /**
   * Called as soon as book_lesson refuses, before the refresh: show the refusal while the
   * screen still shows what was pressed (the refresh may take the start or its length away).
   */
  onRefused?: (error: Error, input: Input) => void
}

/**
 * book_lesson (TECH_SPEC §5.2): a customer books one of their groups, once or every week for
 * `repeatWeeks` weeks. Then it refreshes what a booking changes (refreshAfterBooking), after
 * a refusal too, and stays pending until the fresh data is in. Refusals (book spec §5.3.3):
 * slot_check's reasons for one week, repeat_conflict {dates, clashes}, credit_exceeded
 * {needed, can_still_book}, group_inactive, not_approved, not_your_group, invalid_repeat,
 * invalid_length; messageFor turns each into words.
 *
 * Anything else the caller puts in the input (what it needs to show the outcome, such as
 * the group's names) is not sent, and comes back to onBooked and onRefused as it was.
 */
export function useBookLesson<Input extends BookLessonInput = BookLessonInput>({
  onBooked,
  onRefused,
}: UseBookLessonOptions<Input> = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, startsAt, minutes, repeatWeeks }: Input) =>
      rpc('book_lesson', {
        p_group_id: groupId,
        p_starts_at: startsAt,
        p_minutes: minutes,
        p_repeat_weeks: repeatWeeks,
      }),
    onSuccess: (bookingIds, input) => {
      onBooked?.(bookingIds, input)
      return refreshAfterBooking(queryClient)
    },
    onError: (error, input) => {
      onRefused?.(error, input)
      return refreshAfterBooking(queryClient, error)
    },
  })
}

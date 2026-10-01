import { useMutation, useQueryClient } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'

import { refreshAfterPayment } from './refreshAfterPayment'

export type AddFreeLessonInput = {
  groupId: string
  /** The coach's note; blank is no note. */
  note?: string
}

type UseAddFreeLessonOptions = {
  /** Called as soon as the lesson is added, before the refresh. */
  onAdded?: (input: AddFreeLessonInput) => void
}

/**
 * `add_free_lesson` (TECH_SPEC §5.2; the coach only): a payment of 1 lesson at RM 0, method
 * free, dated today (BR-20). Then it refreshes what a payment changes, and stays pending
 * until the fresh data is in.
 */
export function useAddFreeLesson({ onAdded }: UseAddFreeLessonOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, note }: AddFreeLessonInput) =>
      rpc('add_free_lesson', { p_group_id: groupId, p_note: note?.trim() || undefined }),
    onSuccess: (_paymentId, input) => {
      onAdded?.(input)
      return refreshAfterPayment(queryClient)
    },
  })
}

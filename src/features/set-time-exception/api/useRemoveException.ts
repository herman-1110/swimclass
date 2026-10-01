import { useMutation, useQueryClient } from '@tanstack/react-query'

import { rpc, toAppError } from '@/shared/api/rpc'

import { refreshOpenTime } from './refreshOpenTime'

export type RemoveExceptionInput = { id: string }

type UseRemoveExceptionOptions = {
  /** Called as soon as it is removed, before the refresh: show the notice. */
  onRemoved?: (input: RemoveExceptionInput) => void
}

/**
 * `remove_exception` (TECH_SPEC §5.4; the coach only): a Block time or Open extra time goes,
 * and the weekly hours apply again. Then it refreshes the week views and free start times,
 * also after `not_found` (another tab removed it already: the list was out of date), and
 * stays pending until they are fresh.
 */
export function useRemoveException({ onRemoved }: UseRemoveExceptionOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: RemoveExceptionInput) => rpc('remove_exception', { p_id: id }),
    onSuccess: (_nothing, input) => onRemoved?.(input),
    onSettled: (_nothing, error) =>
      error && toAppError(error).code !== 'not_found' ? undefined : refreshOpenTime(queryClient),
  })
}

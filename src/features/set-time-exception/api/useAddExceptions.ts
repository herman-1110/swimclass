import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ExceptionKind } from '@/entities/schedule'
import { rpc } from '@/shared/api/rpc'
import type { DateKey } from '@/shared/lib/time'

import { PartlySavedError } from '../model/partlySaved'
import { rangeOn } from '../model/times'
import { refreshOpenTime } from './refreshOpenTime'

export type AddExceptionsInput = {
  /** closed: Block time. open: Open extra time. */
  kind: ExceptionKind
  /** The days, in date order: the same hours on each. */
  dates: readonly DateKey[]
  /** Minutes of the day: `from` 0–1410, `to` up to 1440 (the next midnight). */
  from: number
  to: number
  /** The coach's private note; the database trims it, and a blank one is left out. */
  note: string
}

type UseAddExceptionsOptions = {
  /** Called as soon as every day is saved, before the refresh: close the dialog. */
  onSaved?: (input: AddExceptionsInput) => void
}

/**
 * Block time or Open extra time: one `add_exception` per day, in date order, with the same
 * hours each day (prompt 08 TASK 5). It stops at the first refusal: when some days were
 * saved already it fails with a PartlySavedError naming them and the day that failed (the
 * calls are not one transaction), otherwise with the refusal itself. Then it refreshes the
 * week views and free start times (whenever anything may have been saved) and stays pending
 * until they are fresh.
 */
export function useAddExceptions({ onSaved }: UseAddExceptionsOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, dates, from, to, note }: AddExceptionsInput) => {
      const saved: DateKey[] = []
      for (const date of dates) {
        const range = rangeOn(date, from, to)
        try {
          await rpc('add_exception', {
            p_kind: kind,
            p_starts_at: range.startsAt.toISOString(),
            p_ends_at: range.endsAt.toISOString(),
            p_note: note.trim() || undefined,
          })
        } catch (error) {
          if (saved.length === 0) throw error
          throw new PartlySavedError(saved, date, error)
        }
        saved.push(date)
      }
      return saved
    },
    onSuccess: (_saved, input) => onSaved?.(input),
    onSettled: (_saved, error) =>
      error && !(error instanceof PartlySavedError) ? undefined : refreshOpenTime(queryClient),
  })
}

import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'

export type ExcuseOutcome = {
  /** DESIGN §6's words, the coach's table first (messages.ts). */
  message: string
  /** Only a network failure is worth trying again. */
  canRetry: boolean
}

/**
 * What a failed `excuse_booking` means (the Students spec §5.3 W3, the Schedule spec §5.4):
 * `not_started` "This lesson hasn’t started yet. Cancel it instead.", `not_booked` "This
 * lesson is already excused. Refresh to see the latest.", anything else generic.
 */
export function excuseErrorOutcome(error: unknown): ExcuseOutcome {
  return {
    message: messageFor(error, { audience: 'coach' }),
    canRetry: toAppError(error).code === 'network',
  }
}

// The refusals that mean the lesson on screen was out of date (refetch the list).
const STALE = new Set(['not_booked', 'not_started', 'not_found'])

/** Whether to refresh the lessons after this refusal. */
export function refreshesAfter(error: unknown): boolean {
  return STALE.has(toAppError(error).code)
}

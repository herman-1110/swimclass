import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'

import type { CancelAudience } from './types'

export type CancelOutcome = {
  /** DESIGN §6's words (messages.ts), the coach's table first for the coach. */
  message: string
  /** Pressing "Cancel lesson" again may work: only after a network failure, or the coach's
   *  reason being too long. Otherwise the confirmation offers "Close" alone. */
  canRetry: boolean
  /** Where the message goes: the coach's reason field, or the line above the buttons. */
  field: 'reason' | null
}

/**
 * What a failed cancellation means in the dialog (the My classes spec §5.4, the Schedule
 * spec §5.4): `locked` says the cutoff (`cutoffHours`, from settings), `not_booked` that the
 * screen was out of date; only `network` (and the coach's `invalid_reason`) can be retried.
 */
export function cancelErrorOutcome(
  error: unknown,
  { audience, cutoffHours }: { audience: CancelAudience; cutoffHours?: number | null },
): CancelOutcome {
  const { code } = toAppError(error)
  const message = messageFor(error, { audience, cutoffHours })
  if (code === 'network') return { message, canRetry: true, field: null }
  if (code === 'invalid_reason' && audience === 'coach') {
    return { message, canRetry: true, field: 'reason' }
  }
  return { message, canRetry: false, field: null }
}

// The refusals that mean the lesson on screen was out of date: refresh the lists (and, for
// not_approved, the profile, so the guard sends the account to Waiting for approval).
const STALE = new Set(['locked', 'not_booked', 'not_found', 'not_your_booking', 'not_approved'])

/** Whether the screen should refresh after this refusal (My classes §5.5). */
export function refreshesAfter(error: unknown): boolean {
  return STALE.has(toAppError(error).code)
}

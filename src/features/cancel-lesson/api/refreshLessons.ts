import { type QueryClient, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { paymentKeys } from '@/entities/payment'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { toAppError } from '@/shared/api/rpc'

// What a cancelled lesson changes (data-contracts §8, TECH_SPEC §11): Book's free start
// times, the week views, package balances and the lesson lists; payments too (the build
// plan), so the coach's payment panel never shows a stale package.
const CHANGED = [slotKeys.all, scheduleKeys.all, balanceKeys.all, bookingKeys.all, paymentKeys.all]

/**
 * Refreshes everything a cancellation changes. After `not_approved` the profile too, so the
 * guard sends an account that lost its approval to Waiting for approval (the auth spec §5.4).
 */
export async function refreshLessons(queryClient: QueryClient, error?: unknown): Promise<void> {
  const keys =
    error !== undefined && toAppError(error).code === 'not_approved'
      ? [...CHANGED, accountKeys.all]
      : CHANGED
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/** refreshLessons for a component: the cancel confirmation refreshes after a refusal. */
export function useRefreshLessons(): (error?: unknown) => Promise<void> {
  const queryClient = useQueryClient()
  return (error) => refreshLessons(queryClient, error)
}

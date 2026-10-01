import type { QueryClient } from '@tanstack/react-query'

import { balanceKeys } from '@/entities/balance'
import { paymentKeys } from '@/entities/payment'
import { scheduleKeys } from '@/entities/schedule'

// What a payment or a free lesson changes (data-contracts §8): the package balances, the
// payment lists, and the coach's week (its lessons carry `unpaid` and `last_lesson`).
const CHANGED = [balanceKeys.all, paymentKeys.all, scheduleKeys.all]

/** Refreshes everything a payment changes; resolves once the fresh data is in. */
export async function refreshAfterPayment(queryClient: QueryClient): Promise<void> {
  await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

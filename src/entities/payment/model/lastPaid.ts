import { type DateKey, formatDayMonth, type Instant } from '@/shared/lib/time'

import { methodInSentence } from './method'
import type { PaymentMethod } from './types'

/** A group's latest payment, as group_balance has it, and its starting balance. */
export type LastPaidInput = {
  /** group_balance.last_paid_on: "2026-08-22", or null without a payment. */
  paidOn: DateKey | null
  /** group_balance.last_payment_method. */
  method: PaymentMethod | null
  /** group_details.opening_paid_lessons: lessons paid before the app. */
  openingPaid?: number
}

/**
 * The last payment inside a sentence, for the Students phone cards' note line (coach-students
 * spec §5.2.4): "last paid 22 Aug, cash", "last paid 16 Aug, FPX"; with no payment row "paid
 * in starting balance" or "no payments yet". BalanceStatus joins it to its note.
 */
export function lastPaidPhrase(
  { paidOn, method, openingPaid = 0 }: LastPaidInput,
  now?: Instant,
): string {
  if (paidOn !== null) {
    const date = formatDayMonth(paidOn, now)
    return method === null ? `last paid ${date}` : `last paid ${date}, ${methodInSentence(method)}`
  }
  return openingPaid > 0 ? 'paid in starting balance' : 'no payments yet'
}

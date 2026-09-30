import { format } from 'date-fns'

import { type DateKey, type Instant, mytInstant, toMyt } from '@/shared/lib/time'

/** A date column ("2026-09-19") at noon Malaysia time, so it names that day in any time zone. */
function paidDay(paidOn: DateKey) {
  return toMyt(mytInstant(paidOn, '12:00'))
}

/**
 * The day a payment was made, from its date column: "19 Sep". With `now`, a day in another
 * year shows the year too: "12 Dec 2025" (coach-students spec §6).
 */
export function formatPaidOn(paidOn: DateKey, now?: Instant): string {
  const day = paidDay(paidOn)
  const sameYear = now === undefined || toMyt(now).getFullYear() === day.getFullYear()
  return format(day, sameYear ? 'd MMM' : 'd MMM yyyy')
}

/** The day a payment was made, with its year: "19 Sep 2026" (My classes' receipts). */
export function formatPaidOnFull(paidOn: DateKey): string {
  return format(paidDay(paidOn), 'd MMM yyyy')
}

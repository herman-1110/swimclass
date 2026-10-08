import { methodLabel, type Payment } from '@/entities/payment'
import { formatRinggit, plural, possessive } from '@/shared/lib/format'
import { formatDayMonth, type Instant } from '@/shared/lib/time'

// The Record payment panel's words (DESIGN §6: "Save payment" → "Payment saved"; the rest
// coach-students §5.2.8 and §5.3 W2, proposed).

// A button keeps its name through the flow ("Save payment" → "Payment saved", DESIGN §6); the
// status line that says the same under it is a sentence, with a full stop like every notice.

export const SAVE_PAYMENT = 'Save payment'
export const PAYMENT_SAVED = 'Payment saved'
export const PAYMENT_SAVED_STATUS = 'Payment saved.'

/** The second Package option, which opens "Number of lessons". */
export const CUSTOM_LESSONS = 'Custom number of lessons'

/** The note's example: "e.g. Paid by Farah at the pool" (the account holder's name). */
export function notePlaceholder(accountName: string): string {
  return `e.g. Paid by ${accountName.trim()} at the pool`
}

/** "Add a free lesson" opens this line: "Adds 1 lesson at RM 0 to Hana’s package, dated today." */
export function freeLessonHelp(names: string): string {
  return `Adds 1 lesson at ${formatRinggit(0)} to ${possessive(names)} package, dated today.`
}

export const ADD_FREE_LESSON = 'Add 1 free lesson'
export const FREE_LESSON_ADDED = 'Free lesson added'
export const FREE_LESSON_ADDED_STATUS = 'Free lesson added.'

// Removing a payment saved by mistake, from History's Payments (Herman, 9 Oct 2026).

/** What Remove names, after "Remove": "the RM 240 payment of 22 Aug", "the free lesson of 26 Sep". */
export function removePaymentName(payment: Payment, now?: Instant): string {
  const date = formatDayMonth(payment.paid_on, now)
  return payment.method === 'free'
    ? `the free lesson of ${date}`
    : `the ${formatRinggit(payment.amount_cents)} payment of ${date}`
}

export const REMOVE_PAYMENT_TITLE = 'Remove this payment?'

/**
 * What removing does: "RM 240 · 4 lessons · 22 Aug · Cash. This takes 4 lessons off Aiman &
 * Sofia’s packages and the payment off their receipts. Nobody is emailed." A free lesson
 * reads "Free · 1 lesson · 26 Sep." first.
 */
export function removePaymentDescription(payment: Payment, names: string, now?: Instant): string {
  const free = payment.method === 'free'
  const lessons = plural(payment.lessons, 'lesson')
  const what = [
    free ? 'Free' : formatRinggit(payment.amount_cents),
    lessons,
    formatDayMonth(payment.paid_on, now),
    ...(free ? [] : [methodLabel(payment.method)]),
  ].join(' · ')
  return `${what}. This takes ${lessons} off ${possessive(names)} packages and the payment off their receipts. Nobody is emailed.`
}

export const REMOVE_PAYMENT = 'Remove payment'
export const KEEP_PAYMENT = 'Keep payment'
export const PAYMENT_REMOVED = 'Payment removed.'
/** Removed meanwhile (another tab): the payment is gone all the same. */
export const PAYMENT_ALREADY_REMOVED = 'This payment was already removed.'

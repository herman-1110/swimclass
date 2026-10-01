import { formatRinggit, possessive } from '@/shared/lib/format'

// The Record payment panel's words (DESIGN §6: "Save payment" → "Payment saved"; the rest
// coach-students §5.2.8 and §5.3 W2, proposed).

export const SAVE_PAYMENT = 'Save payment'
export const PAYMENT_SAVED = 'Payment saved'

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

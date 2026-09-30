import type { PaymentMethod } from './types'

const LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  transfer: 'Transfer',
  fpx: 'FPX',
  free: 'Free lesson',
  other: 'Other',
}

// Inside a sentence the words are lower case, except FPX (AdminStudents.dc.html: "last paid
// 22 Aug, cash", "last paid 16 Aug, FPX").
const IN_SENTENCE: Record<PaymentMethod, string> = {
  cash: 'cash',
  transfer: 'transfer',
  fpx: 'FPX',
  free: 'free lesson',
  other: 'other',
}

/** "Cash", "Transfer", "FPX", "Free lesson", "Other" (coach-students spec §5.2.5). */
export function methodLabel(method: PaymentMethod): string {
  return LABELS[method]
}

/** The method inside a sentence: "cash", "transfer", "FPX", "free lesson", "other". */
export function methodInSentence(method: PaymentMethod): string {
  return IN_SENTENCE[method]
}

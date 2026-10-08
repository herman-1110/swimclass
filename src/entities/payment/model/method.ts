import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'

import type { PaymentMethod } from './types'
import { paymentWords } from './words'

// Inside a sentence the words are lower case, except FPX (AdminStudents.dc.html: "last paid
// 22 Aug, cash", "last paid 16 Aug, FPX"). The coach's words: English only.
const IN_SENTENCE: Record<PaymentMethod, string> = {
  cash: 'cash',
  transfer: 'transfer',
  fpx: 'FPX',
  free: 'free lesson',
  other: 'other',
}

/** "Cash", "Transfer", "FPX", "Free lesson", "Other" (coach-students spec §5.2.5). */
export function methodLabel(method: PaymentMethod, language: Language = 'en'): string {
  return wordsIn(paymentWords, language).method[method]
}

/** The method inside a sentence: "cash", "transfer", "FPX", "free lesson", "other". */
export function methodInSentence(method: PaymentMethod): string {
  return IN_SENTENCE[method]
}

import { defineWords } from '@/shared/i18n/words'
import { plural } from '@/shared/lib/format'

// Payments on My classes. Chinese in words.zh.ts (HANDOFF v0.26); the coach's Students
// screen stays English.
export const paymentWords = defineWords('payment', {
  /** "Cash", "Transfer", "FPX", "Free lesson", "Other" (coach-students spec §5.2.5). */
  method: {
    cash: 'Cash',
    transfer: 'Transfer',
    fpx: 'FPX',
    free: 'Free lesson',
    other: 'Other',
  },
  /** My classes' package header: "Paid 19 Sep · FPX", "Paid 19 Sep". */
  paid: (date: string, method: string | null) =>
    method === null ? `Paid ${date}` : `Paid ${date} · ${method}`,
  /** A free lesson's amount. */
  free: 'Free',
  /** "4 lessons". */
  lessons: (count: number) => plural(count, 'lesson'),
  /** The cell's words without a payment row. */
  startingBalance: 'Starting balance',
  noneYet: 'None yet',
})

export type PaymentWords = typeof paymentWords.en

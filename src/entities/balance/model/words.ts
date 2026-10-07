import { defineWords } from '@/shared/i18n/words'

// A package's words on the student pages (Book, My classes). Chinese in words.zh.ts (HANDOFF
// v0.26); the coach's Students screen stays English.
export const balanceWords = defineWords('balance', {
  /** "Package 4". */
  packageName: (no: number) => `Package ${no}`,
  /** "0 used · 2 booked · 2 left to book", or "… · fully booked" when nothing is left. */
  counts: (used: number, booked: number, left: number) =>
    `${used} used · ${booked} booked · ${left > 0 ? `${left} left to book` : 'fully booked'}`,
  /** A later package's: "1 booked · 3 left to book". */
  laterCounts: (booked: number, left: number) =>
    `${booked} booked · ${left > 0 ? `${left} left to book` : 'fully booked'}`,
  paid: 'Paid',
  unpaid: 'Unpaid',
  /** The Unpaid pill: "Package 2 unpaid". */
  unpaidPill: (no: number) => `Package ${no} unpaid`,
  howToPay: 'How to pay:',
  /**
   * Book's note: "New bookings start Package 3. Pay RM 240 before or at its first lesson.",
   * "… Pay for it before …" without a price.
   */
  bookNote: (no: number, price: string | null) =>
    `New bookings start Package ${no}. ${price === null ? 'Pay for it' : `Pay ${price}`} before or at its first lesson.`,
})

export type BalanceWords = typeof balanceWords.en

import { defineWords } from '@/shared/i18n/words'
import { possessive } from '@/shared/lib/format'

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
  /**
   * My classes' notes (accountPackageNote). The group's next lesson starts an unpaid package:
   * "After 4 Oct, Sofia’s next 1-to-1 lesson starts Package 3. Pay RM 240 before or at its
   * first lesson." (`after` null: no "After …, ").
   */
  nextStarts: (
    after: string | null,
    names: string,
    type: string,
    no: number,
    price: string | null,
  ) =>
    `${after === null ? '' : `After ${after}, `}${possessive(names)} next ${type} lesson starts Package ${no}. Pay${price === null ? '' : ` ${price}`} before or at its first lesson.`,
  /** The next lesson isn't paid (a free lesson or an uneven starting balance left part of it). */
  nextUnpaid: (after: string | null, names: string, type: string) =>
    `${after === null ? '' : `After ${after}, `}${possessive(names)} next ${type} lesson isn’t paid yet. Pay before or at that lesson.`,
  /** Lessons booked past what's paid, the first still ahead. */
  unpaidAhead: (no: number, price: string | null) =>
    `Package ${no} isn’t paid yet. Pay${price === null ? '' : ` ${price}`} before or at its first lesson.`,
  /** Lessons used past what's paid. */
  unpaidNow: (no: number, price: string | null) =>
    `Package ${no} isn’t paid yet. Pay your coach${price === null ? '' : ` ${price}`} as soon as you can.`,
})

export type BalanceWords = typeof balanceWords.en

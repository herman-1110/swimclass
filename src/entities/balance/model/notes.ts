import { messageFor } from '@/shared/config/messages'
import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'
import { formatRinggit } from '@/shared/lib/format'
import { formatDayMonth, type Instant, toMyt } from '@/shared/lib/time'

import { isNextLessonPaid, nextBookingPackageNo } from './packages'
import type { GroupBalance } from './types'
import { balanceWords } from './words'

// The orange line under a package (DESIGN §4): what the customer should pay, and when. Display
// only: the database decides the balance, and whether a booking may go ahead.

/**
 * Book's line under the package bar (book spec §5.2.1), or null while the next lesson booked is
 * paid for (used + booked < paid, as on My classes; a free lesson counts). Once it isn't, and
 * the package has no lesson left to book, or the next lesson starts a package no payment covers
 * (a new group that hasn't paid, a package used up exactly): "New bookings start Package 3. Pay
 * RM 240 before or at its first lesson." Without a price for the group's type: "… Pay for it
 * before or at its first lesson." A group that can book nothing more (can_still_book 0 or less)
 * gets DESIGN §6's credit_exceeded words instead.
 */
export function bookPackageNote(
  balance: GroupBalance,
  priceCents: number | null,
  language: Language = 'en',
): string | null {
  if (isNextLessonPaid(balance)) return null
  const counted = balance.used_lessons + balance.booked_lessons
  const startsUnpaidPackage =
    counted === balance.paid_lessons && counted % balance.package_size === 0
  if (balance.left_in_package > 0 && !startsUnpaidPackage) return null
  if (balance.can_still_book <= 0) return messageFor({ code: 'credit_exceeded' }, { language })
  const price = priceCents === null ? null : formatRinggit(priceCents)
  return wordsIn(balanceWords, language).bookNote(nextBookingPackageNo(balance), price)
}

/** What My classes' note needs besides the balance. */
export type AccountNoteInput = {
  /** The group's names: "Sofia", "Aiman & Sofia". */
  names: string
  /** "1-to-1". */
  typeLabel: string
  /** The package price for the group's type (settings), or null while none is set. */
  priceCents: number | null
  /** useNow(): whether the first unpaid lesson is still ahead. */
  now: Instant
}

/**
 * My classes' line under a package (my-classes spec §5.2), or null while the group's next
 * lesson is paid for. P = paid lessons, C = used + booked, S = the package size:
 * - C = P, P a whole number of packages: "After 4 Oct, Sofia’s next 1-to-1 lesson starts
 *   Package 3. Pay RM 240 before or at its first lesson." ("After …, " only while the last paid
 *   lesson is still ahead; "Pay before …" without a price).
 * - C = P otherwise (a free lesson or an uneven starting balance): "… next 1-to-1 lesson
 *   isn’t paid yet. Pay before or at that lesson."
 * - C > P (unpaid): "Package 6 isn’t paid yet. Pay RM 240 before or at its first lesson." while
 *   the first unpaid lesson is ahead, else "Package 2 isn’t paid yet. Pay your coach RM 240 as
 *   soon as you can."
 */
export function accountPackageNote(
  balance: GroupBalance,
  { names, typeLabel, priceCents, now }: AccountNoteInput,
  language: Language = 'en',
): string | null {
  if (isNextLessonPaid(balance)) return null
  const w = wordsIn(balanceWords, language)
  const paid = balance.paid_lessons
  const counted = balance.used_lessons + balance.booked_lessons
  const size = balance.package_size
  const price = priceCents === null ? null : formatRinggit(priceCents)

  if (counted === paid) {
    const after = balance.last_lesson_at
      ? formatDayMonth(balance.last_lesson_at, now, language)
      : null
    if (paid % size === 0) return w.nextStarts(after, names, typeLabel, paid / size + 1, price)
    return w.nextUnpaid(after, names, typeLabel)
  }

  const unpaidNo = Math.floor(paid / size) + 1
  const ahead =
    balance.unpaid_since !== null && toMyt(balance.unpaid_since).getTime() > toMyt(now).getTime()
  return ahead ? w.unpaidAhead(unpaidNo, price) : w.unpaidNow(unpaidNo, price)
}

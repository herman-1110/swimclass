import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'
import { formatDay, formatRange, type Instant, mytDateKey, toMyt } from '@/shared/lib/time'

import { bookingWords } from './words'

/** Whether two moments fall on the same Malaysia calendar day. */
export function isSameMytDay(a: Instant, b: Instant): boolean {
  return mytDateKey(a) === mytDateKey(b)
}

/**
 * "Sat 3 Oct, 9:00–10:00 am", never "Today": the cancel dialog's title, the Cancel button's
 * name, the coach's excuse options and History. With `now`, a lesson in another year shows the
 * year: "Fri 12 Dec 2025, 7:30–8:30 pm" (coach-students spec §6).
 */
export function lessonDateRange(
  startsAt: Instant,
  endsAt: Instant,
  now?: Instant,
  language: Language = 'en',
): string {
  const w = wordsIn(bookingWords, language)
  const year = toMyt(startsAt).getFullYear()
  const otherYear = now !== undefined && toMyt(now).getFullYear() !== year
  const day = formatDay(startsAt, language)
  const range = formatRange(startsAt, endsAt, language)
  return w.dayRange(otherYear ? w.dayInYear(day, year) : day, range)
}

/**
 * A lesson row's first line (MyClasses.dc.html:61): "Today, 5:00–6:00 pm" on today's MYT date,
 * otherwise "Sat 3 Oct, 9:00–10:00 am".
 */
export function lessonWhen(
  startsAt: Instant,
  endsAt: Instant,
  now: Instant,
  language: Language = 'en',
): string {
  return isSameMytDay(startsAt, now)
    ? wordsIn(bookingWords, language).today(formatRange(startsAt, endsAt, language))
    : lessonDateRange(startsAt, endsAt, undefined, language)
}

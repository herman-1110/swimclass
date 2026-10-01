import { formatDayKey } from '@/entities/schedule'
import { addDays, type DateKey } from '@/shared/lib/time'

// "Repeat weekly" (prompt 06 TASK 5; PRD BR-13; book spec §5.2.4, C1–C3). A preview only:
// book_lesson books every week or none, and answers repeat_conflict or credit_exceeded.

/**
 * Lessons one booking uses: 1 for an hour, 2 for two hours (CLAUDE.md rule 5), rounded as
 * the database's `lessons_for` rounds a length to whole hours.
 */
export function lessonsPerBooking(minutes: number): number {
  return Math.max(1, Math.round(minutes / 60))
}

export type RepeatWeeksInput = {
  /** group_balance.can_still_book: lessons the group may still book (below 0 when over). */
  canStillBook: number
  /** 1 for an hour, 2 for two hours (lessonsPerBooking). */
  lessonsPerBooking: number
  /** The chosen day, the first week. */
  day: DateKey
  /** The last day a customer may book: the Sunday `booking_window_weeks` after this week. */
  lastBookableDay: DateKey
}

/**
 * How many weeks in a row the booking may repeat (N): the smaller of what the group may
 * still book (can_still_book ÷ lessons per booking, rounded down) and how many weekly
 * dates from the chosen day fall on or before the last bookable day. Book shows "Repeat
 * weekly" only when N > 1. At Sat 26 Sep: Aiman & Sofia (6) on Tue 29 Sep for an hour → 4;
 * for two hours → 3; on Sun 27 Sep for an hour → 5.
 */
export function repeatWeeks({
  canStillBook,
  lessonsPerBooking: lessons,
  day,
  lastBookableDay,
}: RepeatWeeksInput): number {
  const byCredit = Math.floor(canStillBook / lessons)
  let inWindow = 0
  // DateKeys ("2026-10-27") compare as text in date order.
  for (let date = day; date <= lastBookableDay; date = addDays(date, 7)) inWindow += 1
  return Math.max(0, Math.min(byCredit, inWindow))
}

/**
 * The checkbox's label for N weeks: "Repeat weekly: also book Tue 6 Oct" for two weeks,
 * "Repeat weekly for 4 weeks" otherwise (prompt 06 TASK 5; DESIGN §4 item 7).
 */
export function repeatLabel(weeks: number, day: DateKey): string {
  return weeks === 2
    ? `Repeat weekly: also book ${formatDayKey(addDays(day, 7))}`
    : `Repeat weekly for ${weeks} weeks`
}

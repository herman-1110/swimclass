import { addDays, type DateKey, mytWeekStart } from '@/shared/lib/time'

/** The weeks a customer may book, as the week navigation shows them. */
export type BookableWindow = {
  /** The Monday of today's MYT week: the first week the navigation shows. */
  thisWeek: DateKey
  /** The Monday of the last week a customer may book: `booking_window_weeks` weeks later. */
  lastWeek: DateKey
  /** The Sunday of that week: the last day a customer may book. */
  lastBookableDay: DateKey
  /** Every Monday the navigation offers, this week first (`booking_window_weeks` + 1 weeks). */
  weekStarts: DateKey[]
}

/**
 * The booking window as a customer's week navigation follows it (TECH_SPEC §5.1: "this
 * week plus booking_window_weeks more", ending on that week's Sunday; Book §1.6, the
 * customer Schedule's last week). At Sat 26 Sep with 4 weeks: 21 Sep … 19 Oct, last day
 * Sun 25 Oct. A preview for the navigation only: `week_slots` and `book_lesson` decide
 * (`outside_window`). `today` is `mytDateKey(nowMyt())`.
 */
export function bookableWindow(today: DateKey, windowWeeks: number): BookableWindow {
  if (!Number.isInteger(windowWeeks) || windowWeeks < 0) {
    throw new RangeError(`Expected a whole number of weeks, got ${windowWeeks}.`)
  }
  const thisWeek = mytWeekStart(today)
  const weekStarts = Array.from({ length: windowWeeks + 1 }, (_, index) =>
    addDays(thisWeek, 7 * index),
  )
  const lastWeek = weekStarts[weekStarts.length - 1]
  return { thisWeek, lastWeek, lastBookableDay: addDays(lastWeek, 6), weekStarts }
}

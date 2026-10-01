import {
  type BookedCoachLesson,
  bookedLessons,
  type CoachDay,
  type CoachWeek,
  minutesIntoDay,
  type TimeRange,
} from '@/entities/schedule'
import { type DateKey, type Instant, toMyt } from '@/shared/lib/time'

import { type DayRange, END_OF_DAY, stepAfter, stepBefore } from './times'

// What the dialogs can tell before saving, from the coach's week (coach_week): which booked
// lessons a block leaves booked, whether extra time falls inside a block or is open already,
// and Block time's default hours. Previews only: add_exception saves whatever is asked
// (ARCHITECTURE §3.1 rule 6).

function ms(instant: Instant): number {
  return toMyt(instant).getTime()
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end
}

function spanOf(range: DayRange) {
  return { start: ms(range.startsAt), end: ms(range.endsAt) }
}

function lessonSpan(range: TimeRange) {
  return { start: ms(range.starts_at), end: ms(range.ends_at) }
}

/** The day `date` in the loaded weeks, if its week is among them. */
export function dayOf(weeks: readonly CoachWeek[], date: DateKey): CoachDay | undefined {
  for (const week of weeks) {
    const day = week.find((each) => each.day === date)
    if (day) return day
  }
  return undefined
}

/**
 * The booked lessons a block would leave booked (prompt 08: "These lessons stay booked"): any
 * that overlap the blocked time on one of its days, in start order, each once.
 */
export function lessonsInside(
  weeks: readonly CoachWeek[],
  ranges: readonly DayRange[],
): BookedCoachLesson[] {
  const spans = ranges.map(spanOf)
  const found = new Map<string, BookedCoachLesson>()
  for (const week of weeks) {
    for (const day of week) {
      for (const lesson of bookedLessons(day)) {
        if (spans.some((span) => overlaps(span, lessonSpan(lesson)))) {
          found.set(lesson.booking_id, lesson)
        }
      }
    }
  }
  return [...found.values()].toSorted((a, b) => ms(a.starts_at) - ms(b.starts_at))
}

/**
 * The blocked time on the extra time's day that overlaps it (prompt 08: "warn if the range
 * falls inside a block"): blocked time wins, so that part stays closed.
 */
export function blocksInside(day: CoachDay, range: DayRange): TimeRange[] {
  const span = spanOf(range)
  return day.closed.filter((closed) => overlaps(span, lessonSpan(closed)))
}

/** Whether all of the extra time is open already (inside one of the day's open windows). */
export function isOpenAlready(day: CoachDay, range: DayRange): boolean {
  const span = spanOf(range)
  return day.open.some((open) => {
    const window = lessonSpan(open)
    return window.start <= span.start && window.end >= span.end
  })
}

/**
 * Block time's default hours for a day (the Schedule spec §6.5, proposed): from its first
 * open window's start to its last one's end, widened to whole start steps; the whole day,
 * "12:00 am" to "12:00 am (midnight)", when it has no open time.
 */
export function openHoursOf(day: CoachDay, step: number): { from: number; to: number } {
  if (day.open.length === 0) return { from: 0, to: END_OF_DAY }
  const starts = day.open.map((open) => minutesIntoDay(day.day, open.starts_at))
  const ends = day.open.map((open) => minutesIntoDay(day.day, open.ends_at))
  return {
    from: stepBefore(Math.max(0, Math.min(...starts)), step),
    to: stepAfter(Math.min(END_OF_DAY, Math.max(...ends)), step),
  }
}

import type { DateKey } from '@/shared/lib/time'
import {
  type MinuteRange,
  WEEK_GRID_FROM,
  WEEK_GRID_TO,
  weekGridHours,
} from '@/shared/ui/weekGridLayout'

import { minutesIntoDay } from './days'
import { intersectRanges, subtractRanges } from './ranges'
import { bookedLessons } from './select'
import type {
  BookedCoachLesson,
  BusyLesson,
  CoachDay,
  CoachWeek,
  CustomerDay,
  CustomerWeek,
  TimeRange,
  Travel,
} from './types'

/**
 * The hours a week grid shows (and the coach's day view lists), in minutes from midnight:
 * whole hours, 7 am to 10 pm or longer (DESIGN §4). One range for the whole week.
 */
export type GridHours = { from: number; to: number }

/** 7 am to 10 pm: the hours shown before a week has loaded. */
export const DEFAULT_HOURS: GridHours = { from: WEEK_GRID_FROM, to: WEEK_GRID_TO }

/**
 * One stretch of a day, in minutes from its MYT midnight (1440 = the next midnight). A day's
 * items cover the grid's hours without overlapping, in time order.
 */
export type TimelineItem<L> =
  | { kind: 'lesson'; start: number; end: number; lesson: L }
  | { kind: 'travel' | 'free' | 'closed'; start: number; end: number }

/** A range of a day, in minutes from its MYT midnight. */
function span(day: DateKey, range: TimeRange): MinuteRange {
  return { start: minutesIntoDay(day, range.starts_at), end: minutesIntoDay(day, range.ends_at) }
}

/**
 * A day as positioned blocks (customer-schedule §5.1, coach-schedule §3.3):
 * - each lesson on its own (two back to back stay two), cut at the end of the grid (midnight);
 * - travel before and after each lesson, only inside open time (TECH_SPEC §5.1), never over
 *   a lesson, touching pieces joined;
 * - closed: the rest of the grid's hours outside open time (this covers blocked time) and
 *   outside lessons (a lesson the coach placed in closed time sits in a gap of it);
 * - free: what is left of the open time.
 */
function dayTimeline<L extends TimeRange & Travel>(
  day: DateKey,
  open: readonly TimeRange[],
  lessons: readonly L[],
  hours: GridHours,
): TimelineItem<L>[] {
  const shown = [{ start: hours.from, end: hours.to }]
  const openTime = intersectRanges(
    open.map((window) => span(day, window)),
    shown,
  )
  const lessonItems = lessons.flatMap((lesson) =>
    intersectRanges([span(day, lesson)], shown).map(({ start, end }) => ({
      kind: 'lesson' as const,
      start,
      end,
      lesson,
    })),
  )
  const lessonTime = lessonItems.map(({ start, end }) => ({ start, end }))
  const around = lessons.flatMap((lesson) => {
    const { start, end } = span(day, lesson)
    return [
      { start: start - lesson.travel_before, end: start },
      { start: end, end: end + lesson.travel_after },
    ]
  })
  const travel = subtractRanges(intersectRanges(around, openTime), lessonTime)
  const free = subtractRanges(openTime, [...lessonTime, ...travel])
  const closed = subtractRanges(shown, [...openTime, ...lessonTime])
  const items: TimelineItem<L>[] = [
    ...lessonItems,
    ...travel.map((range) => ({ kind: 'travel' as const, ...range })),
    ...free.map((range) => ({ kind: 'free' as const, ...range })),
    ...closed.map((range) => ({ kind: 'closed' as const, ...range })),
  ]
  return items.toSorted((a, b) => a.start - b.start)
}

/** One day of the customer's week as blocks: other people's lessons, the viewer's own ("You"), travel, closed and free. */
export function customerDayTimeline(
  day: CustomerDay,
  hours: GridHours,
): TimelineItem<BusyLesson>[] {
  return dayTimeline(day.day, day.open, day.busy, hours)
}

/** One day of the coach's week as blocks: booked lessons, travel, closed and free. */
export function coachDayTimeline(
  day: CoachDay,
  hours: GridHours,
): TimelineItem<BookedCoachLesson>[] {
  return dayTimeline(day.day, day.open, bookedLessons(day), hours)
}

/**
 * The customer grid's hours: 7 am to 10 pm, longer when the week's open time or lessons
 * fall outside it (customer-schedule §3.2). Travel and blocked time never extend it.
 */
export function customerWeekHours(week: CustomerWeek): GridHours {
  return weekGridHours(week.flatMap((d) => [...d.open, ...d.busy].map((r) => span(d.day, r))))
}

/**
 * The coach grid's hours, and his day view's (coach-schedule §3.3): as the customer's,
 * but cancelled and excused lessons don't extend them either.
 */
export function coachWeekHours(week: CoachWeek): GridHours {
  return weekGridHours(
    week.flatMap((d) => [...d.open, ...bookedLessons(d)].map((r) => span(d.day, r))),
  )
}

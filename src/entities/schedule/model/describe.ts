import { joinWithAnd, plural } from '@/shared/lib/format'
import { formatRange, formatTime } from '@/shared/lib/time'

import { atMinute } from './days'
import { dayButtonDate, formatDayKey, formatDayLong } from './labels'
import { bookedLessons } from './select'
import { customerDayTimeline, type GridHours } from './timeline'
import type { CoachDay, CoachLesson, CustomerDay } from './types'

// The words the week views say about a day or a lesson.

/**
 * One line of the customer grid's text alternative (customer-schedule §7.4): the free
 * times and the viewer's own lessons in time order, "Tue 29 Sep: free 7:30 pm to 10:00 pm",
 * "Thu 1 Oct: no free time", "Sat 10 Oct: closed". Other people's lessons, travel and
 * closed time are the rest of the day.
 */
export function describeCustomerDay(day: CustomerDay, hours: GridHours): string {
  const items = customerDayTimeline(day, hours)
  const parts = items.flatMap((item) => {
    if (item.kind === 'free') {
      const from = formatTime(atMinute(day.day, item.start))
      return [`free ${from} to ${formatTime(atMinute(day.day, item.end))}`]
    }
    if (item.kind === 'lesson' && item.lesson.mine) {
      const { starts_at, ends_at } = item.lesson
      return [`your lesson ${formatTime(starts_at)} to ${formatTime(ends_at)}`]
    }
    return []
  })
  const open = day.open.length > 0
  if (open && !items.some((item) => item.kind === 'free')) parts.push('no free time')
  if (!open && parts.length === 0) parts.push('closed')
  return `${formatDayKey(day.day)}: ${parts.join(', ')}`
}

/**
 * What the coach grid reads before a day's lessons (coach-schedule §7.2): "Open
 * 5:30–10:00 pm.", "Open 9:00 am–12:00 pm and 4:00–10:00 pm. Blocked 7:00–9:00 am.",
 * "Closed all day."
 */
export function describeCoachDay(day: CoachDay): string {
  if (day.open.length === 0) return 'Closed all day.'
  const ranges = (list: CoachDay['open']) =>
    joinWithAnd(list.map((range) => formatRange(range.starts_at, range.ends_at)))
  const open = `Open ${ranges(day.open)}.`
  return day.closed.length ? `${open} Blocked ${ranges(day.closed)}.` : open
}

/**
 * A coach day with its number of booked lessons (a 2-hour lesson counts once): "Saturday
 * 3 Oct, 3 lessons" (coach-schedule §7.2: the grid's day lists).
 */
export function dayLessonsLabel(day: CoachDay): string {
  return `${formatDayLong(day.day)}, ${plural(bookedLessons(day).length, 'lesson')}`
}

/**
 * A day button in the phone's day strip: "Sat 3, 3 lessons". It is the button's own words
 * ("Sat", "3", "3 lessons"), so someone using speech can say what they see (WCAG 2.5.3,
 * label in name); the week above the strip names the month.
 */
export function dayButtonLabel(day: CoachDay): string {
  return `${dayButtonDate(day.day)}, ${plural(bookedLessons(day).length, 'lesson')}`
}

/** Where a lesson is: "Vista Heights" for 1-to-1, "1-to-2 · Palm Court" for a group. */
export function lessonPlace(lesson: CoachLesson): string {
  return lesson.size === 1 ? lesson.location : `${lesson.type_label} · ${lesson.location}`
}

/**
 * A lesson's time and place, as the coach's day view writes it (design/AdminSchedule.dc.html):
 * "9:00–10:00 am · 1-to-2 · Palm Court", "10:00 am–12:00 pm · Vista Heights · 2 lessons".
 */
export function lessonLine(lesson: CoachLesson): string {
  const line = `${formatRange(lesson.starts_at, lesson.ends_at)} · ${lessonPlace(lesson)}`
  return lesson.lessons === 2 ? `${line} · 2 lessons` : line
}

/**
 * A lesson's flags, in the drawing's order (coach-schedule §3.4): "Last paid lesson", "Gap
 * override". Join them with " · ". No "Unpaid": paying is the group's status, shown on
 * Students & payments, not on each lesson (Herman, 2 Oct 2026).
 */
export function lessonNotes(lesson: CoachLesson): string[] {
  return [lesson.last_lesson && 'Last paid lesson', lesson.gap_override && 'Gap override'].filter(
    (note) => note !== false,
  )
}

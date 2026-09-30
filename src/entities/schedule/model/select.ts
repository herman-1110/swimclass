import { type DateKey, toMyt } from '@/shared/lib/time'

import type {
  BookedCoachLesson,
  CoachDay,
  CoachException,
  CoachWeek,
  CustomerWeek,
  OwnBusyLesson,
} from './types'

/** Whether the days are the week that starts on `weekStart` (not a week kept on screen while the next loads). */
export function isWeekOf(week: readonly { day: DateKey }[], weekStart: DateKey): boolean {
  return week.length === 7 && week[0].day === weekStart
}

/** The viewer's own lessons on one day of week_busy, in start order (Book's "Already booked this day"). */
export function ownLessonsOn(week: CustomerWeek, day: DateKey): OwnBusyLesson[] {
  const found = week.find((d) => d.day === day)
  return found ? found.busy.filter((lesson): lesson is OwnBusyLesson => lesson.mine) : []
}

/**
 * The day's lessons that are still booked, in start order. Cancelled and excused ones free
 * their time, so the grid, the day view and the day's count leave them out
 * (coach-schedule §3.3, §9 C20).
 */
export function bookedLessons(day: CoachDay): BookedCoachLesson[] {
  return day.lessons.filter((lesson): lesson is BookedCoachLesson => lesson.status === 'booked')
}

/**
 * Every exception of the week once, in start order (coach-schedule §3.8, "Blocked and extra
 * time"): coach_week lists one that crosses midnight on each day it touches.
 */
export function weekExceptions(week: CoachWeek): CoachException[] {
  const byId = new Map<string, CoachException>()
  for (const day of week) for (const exception of day.exceptions) byId.set(exception.id, exception)
  return [...byId.values()].toSorted(
    (a, b) =>
      toMyt(a.starts_at).getTime() - toMyt(b.starts_at).getTime() || a.id.localeCompare(b.id),
  )
}

import type { GroupBalance } from '@/entities/balance'
import type { LessonPosition, UpcomingLesson } from '@/entities/booking'
import { toMyt } from '@/shared/lib/time'

// Where a new lesson goes in its group's packages (TECH_SPEC §4, booking_ledger): the ledger
// numbers a group's counted lessons by start time, after the opening balance. So a lesson
// booked before one already booked takes its place, and the later one moves along, perhaps
// into the next package (My classes then shows both with their new numbers). A preview: the
// database numbers the lesson once it is booked.

/** What the preview needs of a booked lesson that hasn't ended (useUpcomingLessons). */
export type BookedLesson = Pick<UpcomingLesson, 'group_id' | 'starts_at' | 'position'>

/**
 * How many lessons of the group are booked to start before `startsAt` (a 2-hour lesson
 * counts 2): they come before the new lesson in the ledger, and the rest after it.
 */
export function lessonsBookedBefore(
  lessons: readonly BookedLesson[],
  groupId: string,
  startsAt: string,
): number {
  const at = toMyt(startsAt).getTime()
  return lessons
    .filter((lesson) => lesson.group_id === groupId && toMyt(lesson.starts_at).getTime() < at)
    .reduce((sum, lesson) => sum + lesson.position.lessons, 0)
}

/**
 * The new lesson's place, as booking_ledger will number it: after the lessons used and the
 * `bookedBefore` booked lessons that start before it (never more than are booked), so
 * "Package 2, lesson 4 of 4" before a lesson already booked for Sun 4 Oct. `lessons` is 1 for
 * an hour, 2 for two hours.
 */
export function newLessonPosition(
  balance: Pick<GroupBalance, 'package_size' | 'used_lessons' | 'booked_lessons'>,
  bookedBefore: number,
  lessons: number,
): LessonPosition {
  const counted = balance.used_lessons + Math.min(Math.max(bookedBefore, 0), balance.booked_lessons)
  return {
    package_no: Math.floor(counted / balance.package_size) + 1,
    lesson_in_package: (counted % balance.package_size) + 1,
    lessons,
  }
}

import type { BookingStatus, LessonPosition } from './types'

// "lesson 2 of 4": where a lesson sits in its package (BR-23; my-classes spec §5.2,
// coach-schedule spec §3.5). The numbers are the database's (booking_ledger, coach_week);
// booking an earlier lesson renumbers the later ones, so always show what the ledger says.

/** Just the position fields of a ledger row or a coach_week lesson. */
export function positionOf(entry: LessonPosition): LessonPosition {
  return {
    package_no: entry.package_no,
    lesson_in_package: entry.lesson_in_package,
    lessons: entry.lessons,
  }
}

/** A 2-hour lesson that starts on its package's last lesson ends in the next package. */
function spansPackages(position: LessonPosition, packageSize: number): boolean {
  return position.lesson_in_package + position.lessons - 1 > packageSize
}

/**
 * "lesson 2 of 4"; a 2-hour lesson "lessons 1–2 of 4", or "last lesson of Package 2 and first
 * of Package 3" when it starts on its package's last lesson. `packageSize` is
 * lessons_per_package (settings) or group_balance.package_size.
 */
export function lessonNumbers(position: LessonPosition, packageSize: number): string {
  const first = position.lesson_in_package
  if (position.lessons <= 1) return `lesson ${first} of ${packageSize}`
  if (spansPackages(position, packageSize)) {
    return `last lesson of Package ${position.package_no} and first of Package ${position.package_no + 1}`
  }
  return `lessons ${first}–${first + position.lessons - 1} of ${packageSize}`
}

/**
 * My classes' upcoming row: lessonNumbers, with the package first when the lesson is in a
 * later package than the group's current one (group_balance.package_no), usually an unpaid
 * one: "Package 3, lesson 1 of 4". Without `currentPackageNo` it never adds it.
 */
export function upcomingPosition(
  position: LessonPosition,
  packageSize: number,
  currentPackageNo: number | null = null,
): string {
  const numbers = lessonNumbers(position, packageSize)
  const later = currentPackageNo !== null && position.package_no !== currentPackageNo
  return later && !spansPackages(position, packageSize)
    ? `Package ${position.package_no}, ${numbers}`
    : numbers
}

/**
 * The package and the lesson numbers: "Package 2, lesson 2 of 4" (My classes' past rows), or
 * with `separator` " · " "Package 6 · lesson 2 of 4" (the coach's History, excuse options and
 * lesson details). A lesson across two packages names both already.
 */
export function packagePosition(
  position: LessonPosition,
  packageSize: number,
  separator = ', ',
): string {
  const numbers = lessonNumbers(position, packageSize)
  return spansPackages(position, packageSize)
    ? numbers
    : `Package ${position.package_no}${separator}${numbers}`
}

/** A lesson of the coach's week (coach_week): the fields its position text needs. */
export type ScheduleLessonPosition = {
  status: BookingStatus
  /** Ended, by the database clock; null unless booked. */
  used: boolean | null
  package_no: number | null
  lesson_in_package: number | null
  lessons: number
  package_size: number
  /** Students in the group: 1 to 3. */
  size: number
  type_label: string
}

/**
 * The coach's Today list (coach-schedule spec §3.5): "done" once ended, "excused", otherwise
 * lessonNumbers ("lesson 2 of 4", "lessons 1–2 of 4"). Groups of two or three put their type
 * first: "1-to-2, lesson 1 of 4". A cancelled lesson reads "cancelled" (Today leaves them out).
 * The drawn "first lesson of Package 6" for an unpaid group went with "Unpaid, collect today":
 * paying isn't shown on each lesson (Herman, 2 Oct 2026).
 */
export function formatLessonPosition(lesson: ScheduleLessonPosition): string {
  const type = lesson.size > 1 ? `${lesson.type_label}, ` : ''
  if (lesson.status !== 'booked') return `${type}${lesson.status}`
  if (lesson.used) return `${type}done`
  if (lesson.package_no === null || lesson.lesson_in_package === null) return `${type}booked`
  const position = {
    package_no: lesson.package_no,
    lesson_in_package: lesson.lesson_in_package,
    lessons: lesson.lessons,
  }
  return `${type}${lessonNumbers(position, lesson.package_size)}`
}

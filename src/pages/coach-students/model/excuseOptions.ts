import type { ExcusableLesson as BookedLesson } from '@/entities/booking'
import type { ExcusableLesson } from '@/features/excuse-lesson'

/**
 * A group's started lesson (entities/booking, from bookings and booking_ledger) as "Excuse a
 * missed lesson" lists it: its booking id, times and place in its package.
 */
export function toExcuseOption(lesson: BookedLesson): ExcusableLesson {
  return {
    booking_id: lesson.id,
    starts_at: lesson.starts_at,
    ends_at: lesson.ends_at,
    lessons: lesson.position.lessons,
    package_no: lesson.position.package_no,
    lesson_in_package: lesson.position.lesson_in_package,
  }
}

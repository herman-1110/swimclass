import { type Instant, toMyt } from '@/shared/lib/time'

import type { ExcusableLesson, GroupLesson, UpcomingLesson } from './types'

/** How many started lessons the excuse picker offers (coach-students spec Q17: the latest 10). */
export const EXCUSE_LIMIT = 10

/**
 * The upcoming lessons that haven't ended by `now`. The list is as of its last read; a lesson
 * that ends while the page is open counts as used and moves to Past on the next read, so hide
 * it at once (my-classes spec §5.2).
 */
export function notEnded<T extends Pick<UpcomingLesson, 'ends_at'>>(
  lessons: readonly T[],
  now: Instant,
): T[] {
  const at = toMyt(now).getTime()
  return lessons.filter((lesson) => toMyt(lesson.ends_at).getTime() > at)
}

function isExcusable(lesson: GroupLesson, at: number): lesson is ExcusableLesson {
  return (
    lesson.status === 'booked' &&
    lesson.position !== null &&
    lesson.used !== null &&
    toMyt(lesson.starts_at).getTime() <= at
  )
}

/**
 * The lessons the coach may mark as excused: booked ones that have started by `now` (the
 * database refuses a future one with `not_started`), newest first, at most EXCUSE_LIMIT.
 */
export function excusableLessons(lessons: readonly GroupLesson[], now: Instant): ExcusableLesson[] {
  const at = toMyt(now).getTime()
  return lessons
    .filter((lesson): lesson is ExcusableLesson => isExcusable(lesson, at))
    .sort((a, b) => toMyt(b.starts_at).getTime() - toMyt(a.starts_at).getTime())
    .slice(0, EXCUSE_LIMIT)
}

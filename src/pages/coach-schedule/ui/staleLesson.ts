import type { BookedCoachLesson, CoachWeek } from '@/entities/schedule'
import { messageFor } from '@/shared/config/messages'
import { mytDateKey } from '@/shared/lib/time'

/**
 * Whether the lesson in the details is out of date, by the week as last read: null while it
 * is still booked there (or while that week isn't the one read). Otherwise DESIGN §6's words
 * for it, as `cancel_booking` and `excuse_booking` refuse it: "This lesson is already
 * cancelled. Refresh to see the latest." (not_booked), or the generic message when it isn't
 * in its day at all (not_found).
 */
export function staleLessonMessage(
  week: CoachWeek | undefined,
  lesson: Pick<BookedCoachLesson, 'booking_id' | 'starts_at'>,
): string | null {
  const day = week?.find((each) => each.day === mytDateKey(lesson.starts_at))
  if (!day) return null
  const now = day.lessons.find((each) => each.booking_id === lesson.booking_id)
  if (now?.status === 'booked') return null
  const options = { audience: 'coach' } as const
  return now
    ? messageFor({ code: 'not_booked', detail: { status: now.status } }, options)
    : messageFor({ code: 'not_found' }, options)
}

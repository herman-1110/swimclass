import type { Row } from '@/shared/api/rpc'

/** A booked lesson as the bookings table has it (TECH_SPEC §3). The database says booking where the screens say lesson. */
export type Booking = Row<'bookings'>

export type BookingStatus = Booking['status']

type LedgerRow = Row<'booking_ledger'>

/**
 * A booked (counted) lesson with its lesson numbers (the booking_ledger view, TECH_SPEC §4).
 * None of its columns is ever null; the type generator makes every view column nullable.
 */
export type LedgerEntry = { [K in keyof LedgerRow]: NonNullable<LedgerRow[K]> }

/**
 * Where a counted lesson sits in the group's packages (booking_ledger): its package, its
 * number in that package, and how many lessons it counts (2 for a 2-hour lesson). The coach's
 * week (coach_week) gives its lessons the same three fields.
 */
export type LessonPosition = Pick<LedgerEntry, 'package_no' | 'lesson_in_package' | 'lessons'>

/** A booked lesson that hasn't ended by the database clock: My classes' Upcoming list. */
export type UpcomingLesson = Pick<
  Booking,
  'id' | 'group_id' | 'starts_at' | 'ends_at' | 'location'
> & {
  position: LessonPosition
}

/** done: it was booked and has ended. cancelled and excused ones never count. */
export type PastLessonStatus = 'done' | 'cancelled' | 'excused'

/**
 * A customer's lesson that isn't upcoming (My classes' Past lessons): one that has ended, or
 * was cancelled (also ahead of time) or excused. Done lessons keep their lesson numbers.
 */
export type PastLesson = Pick<
  Booking,
  | 'id'
  | 'group_id'
  | 'starts_at'
  | 'ends_at'
  | 'location'
  | 'cancelled_at'
  | 'cancelled_by'
  | 'cancel_reason'
> & {
  status: PastLessonStatus
  position: LessonPosition | null
}

/** The latest past lessons, newest first, and whether older ones exist. */
export type PastLessons = { lessons: PastLesson[]; hasMore: boolean }

/**
 * One lesson of a group, any status (the coach's History): the bookings row, plus its lesson
 * numbers and whether it has ended (`used`, by the database clock) while it is booked.
 */
export type GroupLesson = Pick<
  Booking,
  | 'id'
  | 'group_id'
  | 'starts_at'
  | 'ends_at'
  | 'location'
  | 'status'
  | 'gap_override'
  | 'cancelled_at'
  | 'cancelled_by'
  | 'cancel_reason'
> & {
  position: LessonPosition | null
  used: boolean | null
}

/** A group's newest lessons, newest first, and whether older ones exist (the coach's History). */
export type GroupLessons = { lessons: GroupLesson[]; hasMore: boolean }

/** A booked lesson that has started: the coach may mark it as excused (excuse_booking). */
export type ExcusableLesson = GroupLesson & {
  status: 'booked'
  position: LessonPosition
  used: boolean
}

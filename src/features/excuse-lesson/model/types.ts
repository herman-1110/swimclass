/**
 * The lesson in the coach's lesson details (a coach_week lesson can be passed as it is).
 * The field names are the database's.
 */
export type ExcuseCandidate = {
  booking_id: string
  /** Any ISO instant with an offset (coach_week sends MYT text). */
  starts_at: string
  ends_at: string
  /** "Wei Jie", "Aiman & Sofia". */
  display_names: string
}

/**
 * One of a group's booked lessons that has started, for "Excuse a missed lesson" in the
 * Record payment panel: a booking_ledger row (entities/booking) can be passed as it is.
 */
export type ExcusableLesson = {
  booking_id: string
  starts_at: string
  ends_at: string
  /** 1, or 2 for a 2-hour lesson. */
  lessons: number
  /** The package the lesson is in, and its place in it ("Package 2 · lesson 2 of 4"). */
  package_no: number
  lesson_in_package: number
}

/** What ExcuseMissedLesson needs of the lessons' query (a TanStack Query result has it).
 *  isFetching and errorUpdatedAt keep "Try again" in place, busy, while it reads again. */
export type ExcusableLessonsQuery = {
  data: readonly ExcusableLesson[] | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  error: unknown
  errorUpdatedAt: number
  refetch: () => Promise<unknown>
}

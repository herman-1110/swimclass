/**
 * A lesson someone may cancel, as any screen has it: My classes' upcoming lesson (bookings
 * and group_details) or the coach's lesson details (a coach_week lesson, which can be
 * passed as it is). The field names are the database's.
 */
export type CancelableLesson = {
  booking_id: string
  /** Any ISO instant with an offset: a bookings column (UTC) or coach_week's MYT text. */
  starts_at: string
  ends_at: string
  /** The group's students: "Aiman & Sofia" (display_names). */
  display_names: string
  /** The account holder ("Mei Ling", coach_week's account_name): the coach's reason help
   *  and notice name them. */
  account_name?: string
}

/** Who is cancelling: the customer on My classes, or the coach in the lesson details. */
export type CancelAudience = 'customer' | 'coach'

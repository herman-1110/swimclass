import { type DateKey, type Instant, mytInstant, toMyt } from '@/shared/lib/time'

// Clock arithmetic for the week views, in Malaysia time (CLAUDE.md rule 2). Calendar steps
// (addDays, weekDays) are in shared/lib/time.

const MINUTE = 60 * 1000

/**
 * Minutes from the MYT midnight that starts `day` to a moment: 1170 for 7:30 pm, 1440 for
 * the next midnight, negative before the day starts.
 */
export function minutesIntoDay(day: DateKey, at: Instant): number {
  return (toMyt(at).getTime() - mytInstant(day, '00:00').getTime()) / MINUTE
}

/** The moment `minute` minutes after the MYT midnight that starts `day` (1440 = the next midnight). */
export function atMinute(day: DateKey, minute: number): Date {
  return new Date(mytInstant(day, '00:00').getTime() + minute * MINUTE)
}

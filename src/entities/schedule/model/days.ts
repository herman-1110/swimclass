import { type DateKey, type Instant, mytDateKey, mytInstant, toMyt } from '@/shared/lib/time'

// Calendar and clock arithmetic for the week views, all in Malaysia time (CLAUDE.md
// rule 2). MYT has no daylight saving, so a day is always 24 hours.

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

/** The MYT date `days` days after `day` (before it when negative): ("2026-09-28", 6) → "2026-10-04". */
export function addDays(day: DateKey, days: number): DateKey {
  return mytDateKey(mytInstant(day, '12:00').getTime() + days * DAY)
}

/** The 7 dates of the week that starts on `weekStart`, Monday first. */
export function weekDays(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

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

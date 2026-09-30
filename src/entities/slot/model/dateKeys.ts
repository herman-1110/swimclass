import { type DateKey, mytDateKey, mytInstant } from '@/shared/lib/time'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The MYT date `days` days after `date` (before it when negative): "2026-09-28" + 7 →
 * "2026-10-05". MYT has no daylight saving, so a day is always 24 hours; counting from
 * noon keeps every step inside the right day.
 */
export function addDays(date: DateKey, days: number): DateKey {
  return mytDateKey(mytInstant(date, '12:00').getTime() + days * DAY_MS)
}

/** The seven dates of the week that starts on `weekStart` (a Monday), Monday first. */
export function weekDays(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

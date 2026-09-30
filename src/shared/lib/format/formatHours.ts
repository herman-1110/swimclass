import { plural } from './plural'

/**
 * A number of hours: "1 hour", "6 hours", "0 hours" (DESIGN §6 `{cutoff}`, and the cancel
 * notes: "Free to cancel or reschedule up to 6 hours before.").
 */
export function formatHours(hours: number): string {
  if (!Number.isInteger(hours) || hours < 0) {
    throw new RangeError(`Expected a whole number of hours, got ${hours}.`)
  }
  return plural(hours, 'hour')
}

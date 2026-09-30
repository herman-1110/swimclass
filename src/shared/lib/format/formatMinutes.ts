import { plural } from './plural'

/**
 * A number of minutes as people say it (DESIGN §6 `{gap}`, and the lesson lengths): whole
 * hours in hours ("1 hour", "2 hours"), anything else in minutes ("90 minutes",
 * "45 minutes", "0 minutes").
 */
export function formatMinutes(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new RangeError(`Expected a whole number of minutes, got ${minutes}.`)
  }
  if (minutes > 0 && minutes % 60 === 0) return plural(minutes / 60, 'hour')
  return plural(minutes, 'minute')
}

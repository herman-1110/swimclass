import { formatTimeOfDay, timeOfDayMinutes } from '@/entities/open-hours'

import { FIRST_MINUTE, LAST_MINUTE } from './dayRanges'

/** A choice in the Edit hours dialog's From and To selects: value "17:30", label "5:30 pm". */
export type TimeOption = { value: string; label: string }

const STEP = 15

function asTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * The times the dialog offers (coach-settings §7.3): 5:00 am to 11:00 pm every 15 minutes
 * (73), a grid that fits any start step, so the hours needn't change when the step does.
 * A saved time that isn't on it (outside those hours, off the grid, or "24:00") is added
 * in its place with the same kind of label ("12:00 am" for 24:00), so the day opens as it
 * is saved.
 */
export function timeOptions(saved: readonly string[] = []): TimeOption[] {
  const values = new Map<string, number>()
  for (let minutes = FIRST_MINUTE; minutes <= LAST_MINUTE; minutes += STEP) {
    values.set(asTime(minutes), minutes)
  }
  for (const time of saved) {
    if (time === '' || values.has(time)) continue
    try {
      values.set(time, timeOfDayMinutes(time))
    } catch {
      // Not a time of day: nothing to offer.
    }
  }
  return [...values]
    .sort(([, a], [, b]) => a - b)
    .map(([value]) => ({ value, label: formatTimeOfDay(value) }))
}

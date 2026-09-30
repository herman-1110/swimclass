import { formatRange, formatTime, mytInstant } from '@/shared/lib/time'

import type { TimeOfDay, Weekday, WeeklyRange } from './types'

// Times of day (availability_rules' opens_at and closes_at) in words, with the same rules
// as every other time in the app (TECH_SPEC §11, shared/lib/time).

/** Monday first, as the Settings table lists the days. */
export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

const NAMES: Record<Weekday, { short: string; long: string }> = {
  1: { short: 'Mon', long: 'Monday' },
  2: { short: 'Tue', long: 'Tuesday' },
  3: { short: 'Wed', long: 'Wednesday' },
  4: { short: 'Thu', long: 'Thursday' },
  5: { short: 'Fri', long: 'Friday' },
  6: { short: 'Sat', long: 'Saturday' },
  7: { short: 'Sun', long: 'Sunday' },
}

/** A weekday's name: "Mon" (the Settings rows), or "Monday" ("Edit Monday hours"). */
export function weekdayName(weekday: Weekday, width: 'short' | 'long' = 'short'): string {
  return NAMES[weekday][width]
}

const TIME_OF_DAY = /^(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Minutes after midnight: "17:30:00" → 1050, "07:00" → 420, "24:00:00" → 1440. */
export function timeOfDayMinutes(time: TimeOfDay): number {
  const match = TIME_OF_DAY.exec(time)
  const [hours, minutes, seconds] = match ? match.slice(1).map((part) => Number(part ?? 0)) : []
  if (
    !match ||
    hours > 24 ||
    minutes > 59 ||
    seconds > 59 ||
    (hours === 24 && minutes + seconds > 0)
  ) {
    throw new RangeError(`Expected a time of day like "17:30:00", got "${time}".`)
  }
  return hours * 60 + minutes + seconds / 60
}

// Any MYT date: only the clock is read. A range ending at "24:00" ends on the next day.
const SOME_DAY = mytInstant('2026-01-05', '00:00').getTime()

function onSomeDay(time: TimeOfDay): Date {
  return new Date(SOME_DAY + timeOfDayMinutes(time) * 60_000)
}

/** A time of day in words: "8:00 pm", "12:00 pm" (noon), "12:00 am" (midnight, also "24:00"). */
export function formatTimeOfDay(time: TimeOfDay): string {
  return formatTime(onSomeDay(time))
}

/**
 * An open-hours range, written like every range in the app (TECH_SPEC §11; coach-settings
 * §9 C1): "5:30–10:00 pm", "7:00 am–12:00 pm", "5:30 pm–12:00 am".
 */
export function formatHoursRange(opensAt: TimeOfDay, closesAt: TimeOfDay): string {
  return formatRange(onSomeDay(opensAt), onSomeDay(closesAt))
}

/** The weekly ranges by day, Monday first, each day's in opening order: the Settings table's 7 rows. */
export function rangesByWeekday(ranges: readonly WeeklyRange[]): WeeklyRange[][] {
  return WEEKDAYS.map((weekday) =>
    ranges
      .filter((range) => range.weekday === weekday)
      .toSorted((a, b) => timeOfDayMinutes(a.opens_at) - timeOfDayMinutes(b.opens_at)),
  )
}

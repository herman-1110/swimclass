import { formatTimeOfDay } from '@/entities/open-hours'
import { addDays, type DateKey, mytInstant, mytWeekStart, parseDateKey } from '@/shared/lib/time'

// The From and To choices of Block time and Open extra time (prompt 08 TASK 5; the Schedule
// spec §7.4): every start step counted from midnight, so with a 30-minute step "12:00 am",
// "12:30 am" … "11:30 pm", and the day's end "12:00 am (midnight)". A time is a minute of
// the MYT day: 0 is the midnight that starts it, 1440 the one that ends it.

/** The minute that ends a day: "12:00 am (midnight)", sent as the next day's 00:00. */
export const END_OF_DAY = 1440

/** A select's value for a minute of the day: 420 → "07:00", 1440 → "24:00". */
export function timeValue(minute: number): string {
  const hours = Math.floor(minute / 60)
  const minutes = minute % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** The minute a select's value names: "07:00" → 420, "24:00" → 1440; null for "" (Choose). */
export function minuteOf(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const minute = Number(match[1]) * 60 + Number(match[2])
  return minute >= 0 && minute <= END_OF_DAY ? minute : null
}

/** An option's words: "7:00 am", "12:00 pm"; the day's end "12:00 am (midnight)". */
export function timeLabel(minute: number): string {
  const words = formatTimeOfDay(timeValue(minute))
  return minute === END_OF_DAY ? `${words} (midnight)` : words
}

/** Every From choice: each step from midnight up to the last one before the next midnight. */
export function startChoices(step: number): number[] {
  const choices: number[] = []
  for (let minute = 0; minute < END_OF_DAY; minute += step) choices.push(minute)
  return choices
}

/**
 * Every To choice: each step after `from` up to midnight, or every possible end while From
 * is still "Choose".
 */
export function endChoices(step: number, from: number | null): number[] {
  const choices: number[] = []
  for (let minute = step; minute <= END_OF_DAY; minute += step) {
    if (from === null || minute > from) choices.push(minute)
  }
  return choices
}

/** The step at or before `minute`: a start that falls between choices (5:45 with 60-minute steps). */
export function stepBefore(minute: number, step: number): number {
  return Math.max(0, Math.floor(minute / step) * step)
}

/** The step at or after `minute`, at most midnight. */
export function stepAfter(minute: number, step: number): number {
  return Math.min(END_OF_DAY, Math.ceil(minute / step) * step)
}

/** A stretch of one day, as moments: what add_exception is sent for that day. */
export type DayRange = { date: DateKey; startsAt: Date; endsAt: Date }

/** The moments `from` to `to` on `date`; a `to` of 1440 ends at the next day's midnight. */
export function rangeOn(date: DateKey, from: number, to: number): DayRange {
  const endsAt =
    to === END_OF_DAY ? mytInstant(addDays(date, 1), '00:00') : mytInstant(date, timeValue(to))
  return { date, startsAt: mytInstant(date, timeValue(from)), endsAt }
}

/** Whether a date is a real "yyyy-MM-dd" (a cleared date field gives ""). */
export function isDateKey(value: string): boolean {
  return parseDateKey(value) !== null
}

/** The dates from `first` to `last`, both included; just `first` when `last` is null. */
export function datesFrom(first: DateKey, last: DateKey | null): DateKey[] {
  const dates = [first]
  if (last === null) return dates
  for (let date = addDays(first, 1); date <= last; date = addDays(date, 1)) dates.push(date)
  return dates
}

/**
 * The days a dialog saves: the date alone, or each day up to "Until" (Block time). With
 * "Until" before "Date" nothing may be saved (`untilBefore`), and the date alone is still
 * previewed. No days while the date field isn't a date.
 */
export function daysToSave(
  date: string,
  until: string,
): { dates: DateKey[]; untilBefore: boolean } {
  if (!isDateKey(date)) return { dates: [], untilBefore: false }
  if (!isDateKey(until)) return { dates: [date], untilBefore: false }
  if (until < date) return { dates: [date], untilBefore: true }
  return { dates: datesFrom(date, until), untilBefore: false }
}

/** The Monday of each week the dates touch, in order: the coach_week reads the warnings need. */
export function weeksOf(dates: readonly DateKey[]): DateKey[] {
  return [...new Set(dates.map((date) => mytWeekStart(date)))]
}

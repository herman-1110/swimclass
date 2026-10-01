import { timeOfDayMinutes } from '@/entities/open-hours'

import type { HoursRange } from './types'

// The Edit hours dialog's checks (coach-settings §7.3, prompt 10 TASK 2). The database
// checks the end and the overlaps again when Save sends the week (set_open_hours); the
// 5:00 am–11:00 pm limit is the form's own rule: the database takes any range up to 24:00.

/** The earliest opening and the latest closing the form offers: 5:00 am and 11:00 pm. */
export const FIRST_MINUTE = 5 * 60
export const LAST_MINUTE = 23 * 60

/**
 * What's wrong with one range, as a messages.ts code: a time left on "Choose"
 * (hours_incomplete), an end at or before the start (invalid_range), a time outside
 * 5:00 am–11:00 pm (hours_out_of_range), or an overlap with an earlier range of the day
 * (overlapping_rules; touching ranges are fine, they join). `from` and `to` say which
 * select is at fault.
 */
export type RangeProblem = {
  code: 'hours_incomplete' | 'invalid_range' | 'hours_out_of_range' | 'overlapping_rules'
  from: boolean
  to: boolean
}

function minutesOf(time: string): number | null {
  if (time === '') return null
  try {
    return timeOfDayMinutes(time)
  } catch {
    return null
  }
}

function outside(minutes: number): boolean {
  return minutes < FIRST_MINUTE || minutes > LAST_MINUTE
}

/**
 * The first problem of each range, in the order given (null when it's fine): first a select
 * on "Choose", then the end before the start, then the 5:00 am–11:00 pm rule, then an
 * overlap with an earlier range that is fine itself (so the second of two overlapping
 * ranges gets the message).
 */
export function validateDayRanges(ranges: readonly HoursRange[]): (RangeProblem | null)[] {
  const fine: { start: number; end: number }[] = []
  return ranges.map((range) => {
    const start = minutesOf(range.opens_at)
    const end = minutesOf(range.closes_at)
    if (start === null || end === null) {
      return { code: 'hours_incomplete', from: start === null, to: end === null }
    }
    if (end <= start) return { code: 'invalid_range', from: true, to: true }
    if (outside(start) || outside(end)) {
      return { code: 'hours_out_of_range', from: outside(start), to: outside(end) }
    }
    if (fine.some((other) => start < other.end && other.start < end)) {
      return { code: 'overlapping_rules', from: true, to: true }
    }
    fine.push({ start, end })
    return null
  })
}

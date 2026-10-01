import { useQuery } from '@tanstack/react-query'

import type { DateKey } from '@/shared/lib/time'

import { ownLessonsOn } from '../model/select'
import { customerWeekQuery } from './weekQueries'

/**
 * week_busy for the week that starts on `weekStart` (a Monday): the customer Schedule's
 * grid. No placeholder while another week loads: the old week's blocks must never sit under
 * the new week's dates (customer-schedule §5.1). Waits while `weekStart` is null (the
 * Schedule doesn't yet know whether the week asked for is in the booking window).
 */
export function useCustomerWeek(weekStart: DateKey | null) {
  return useQuery({ ...customerWeekQuery(weekStart ?? ''), enabled: weekStart !== null })
}

/**
 * The viewer's own lessons on `day`, a date in the week that starts on `weekStart`, in start
 * order (Book's "Already booked this day", book §5.2.3). It reads the same week_busy query
 * as the Schedule, so picking another day needs no request.
 */
export function useOwnLessonsOnDay(weekStart: DateKey, day: DateKey) {
  return useQuery({ ...customerWeekQuery(weekStart), select: (week) => ownLessonsOn(week, day) })
}

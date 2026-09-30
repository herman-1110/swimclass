import { queryOptions } from '@tanstack/react-query'

import { rpc } from '@/shared/api/rpc'
import type { DateKey } from '@/shared/lib/time'

import { parseCoachWeek, parseCustomerWeek } from '../model/parseWeek'
import { scheduleKeys } from './keys'

// One query per database function (the orchestrator's rule): the hooks that need less of
// a week select from these, so they share its request and its cache entry.

/**
 * week_busy (TECH_SPEC §5.1) for approved customers and the coach: other people's lessons
 * without names. The key needs no account: SessionProvider clears the cache when the
 * account changes.
 */
export function customerWeekQuery(weekStart: DateKey) {
  return queryOptions({
    queryKey: scheduleKeys.customerWeek(weekStart),
    queryFn: async () =>
      parseCustomerWeek(await rpc('week_busy', { p_week_start: weekStart }), weekStart),
  })
}

/** coach_week (TECH_SPEC §5.1), the coach's week with names, payments and exceptions. */
export function coachWeekQuery(weekStart: DateKey) {
  return queryOptions({
    queryKey: scheduleKeys.coachWeek(weekStart),
    queryFn: async () =>
      parseCoachWeek(await rpc('coach_week', { p_week_start: weekStart }), weekStart),
  })
}

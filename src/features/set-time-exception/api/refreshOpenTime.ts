import type { QueryClient } from '@tanstack/react-query'

import { openHoursKeys } from '@/entities/open-hours'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'

// What a blocked or opened stretch changes (data-contracts §8): the week views, the
// customers' free start times, and the exceptions read by the open-hours entity.
const CHANGED = [scheduleKeys.all, slotKeys.all, openHoursKeys.all]

/** Refreshes everything an exception changes; resolves once the fresh data is in. */
export async function refreshOpenTime(queryClient: QueryClient): Promise<void> {
  await Promise.all(CHANGED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

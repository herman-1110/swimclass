import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'
import { type DateKey, mytInstant } from '@/shared/lib/time'

import type { AvailabilityException } from '../model/types'
import { openHoursKeys } from './keys'

/**
 * The one-off changes to the open hours (availability_exceptions) that touch the MYT days
 * from `from` up to, not including, `to` (a week: its Monday and the next Monday), in start
 * order. Only the granted columns: `note` is the coach's private text, which no account may
 * read here, so `select *` would fail (data-contracts §3.7, §7). The coach's notes come
 * with coach_week (entities/schedule).
 */
export function useAvailabilityExceptions(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: openHoursKeys.exceptions(from, to),
    queryFn: async (): Promise<AvailabilityException[]> =>
      readRows('availability_exceptions', {
        columns: ['id', 'kind', 'starts_at', 'ends_at', 'created_at'],
        lt: { starts_at: mytInstant(to, '00:00').toISOString() },
        gt: { ends_at: mytInstant(from, '00:00').toISOString() },
        order: [{ column: 'starts_at' }, { column: 'id' }],
      }),
  })
}

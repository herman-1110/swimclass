import { useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { WeeklyRange } from '../model/types'
import { openHoursKeys } from './keys'

/**
 * The weekly open hours (availability_rules; data-contracts §3.7): every range of every
 * day, by weekday and opening time. Every signed-in account may read them; the coach saves
 * them with set_open_hours. rangesByWeekday gives the Settings table's rows.
 */
export function useWeeklyHours() {
  return useQuery({
    queryKey: openHoursKeys.weekly(),
    queryFn: async () =>
      // The table's check keeps weekday within 1–7.
      (await readRows('availability_rules', {
        columns: ['weekday', 'opens_at', 'closes_at'],
        order: [{ column: 'weekday' }, { column: 'opens_at' }],
      })) as WeeklyRange[],
  })
}

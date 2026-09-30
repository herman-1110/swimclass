import { type DateKey, formatDay, mytInstant } from '@/shared/lib/time'

import { joinWithAnd } from './joinWithAnd'

/**
 * MYT dates ("yyyy-MM-dd", as `repeat_conflict` sends them) as a readable list (DESIGN §6
 * `{dates}`): "Sun 4 Oct", "Tue 13 Oct and Tue 20 Oct", "Tue 29 Sep, Tue 6 Oct and
 * Tue 13 Oct". Throws a RangeError for anything that isn't a real date.
 */
export function formatDateList(dates: readonly DateKey[]): string {
  // Noon MYT names the right day whatever the device's time zone (a bare date would be
  // read as UTC midnight).
  return joinWithAnd(dates.map((date) => formatDay(mytInstant(date, '12:00'))))
}

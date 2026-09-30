import { format } from 'date-fns'

import { type Instant, toMyt } from '@/shared/lib/time'

/**
 * A moment's day as "4 Oct" in Malaysia time ("After 4 Oct, …", "Since 18 Sep"). With `now`,
 * a day in another year shows the year too: "18 Dec 2025".
 */
export function formatDayMonth(value: Instant, now?: Instant): string {
  const day = toMyt(value)
  const sameYear = now === undefined || toMyt(now).getFullYear() === day.getFullYear()
  return format(day, sameYear ? 'd MMM' : 'd MMM yyyy')
}

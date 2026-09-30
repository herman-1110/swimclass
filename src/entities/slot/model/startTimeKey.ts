import { toMyt } from '@/shared/lib/time'

import type { Slot } from './types'

/**
 * A start's MYT wall-clock time as "19:30" (24-hour): Book's `?time=` value, which names
 * one start of the chosen day (book.md §1.4). Find the picked start again with
 * `slotsOfDay(slots, day).find((slot) => startTimeKey(slot) === time)`.
 */
export function startTimeKey(slot: Pick<Slot, 'starts_at'>): string {
  const time = toMyt(slot.starts_at)
  const hours = String(time.getHours()).padStart(2, '0')
  const minutes = String(time.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

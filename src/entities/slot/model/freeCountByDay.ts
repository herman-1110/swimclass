import type { DateKey } from '@/shared/lib/time'

import type { Slot } from './types'

/**
 * How many free start times each day of a week has: Book's day strip (the dot, the date's
 * colour and "Tue 29 Sep, 4 free start times"; book.md §5.2.2). Counted by the rows' `day`,
 * the MYT date. A day whose starts are all crossed out counts 0; a day with no start at
 * all (closed) is missing, so read it with `?? 0`.
 */
export function freeCountByDay(slots: readonly Pick<Slot, 'day' | 'ok'>[]): Map<DateKey, number> {
  const counts = new Map<DateKey, number>()
  for (const slot of slots) counts.set(slot.day, (counts.get(slot.day) ?? 0) + (slot.ok ? 1 : 0))
  return counts
}

/** One day's start times, in the order given: the rows whose MYT `day` is that date. */
export function slotsOfDay<T extends Pick<Slot, 'day'>>(slots: readonly T[], day: DateKey): T[] {
  return slots.filter((slot) => slot.day === day)
}

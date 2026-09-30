import { toMyt } from '@/shared/lib/time'

import type { Slot } from './types'

/**
 * Book's two groups of start times: Morning before noon MYT, Evening from noon
 * (design/Main.dc.html's split at 12:00; afternoon starts from Open extra time fall under
 * Evening, book.md C19). Each keeps the order it is given.
 */
export function splitByPartOfDay<T extends Pick<Slot, 'starts_at'>>(
  slots: readonly T[],
): { morning: T[]; evening: T[] } {
  const morning: T[] = []
  const evening: T[] = []
  for (const slot of slots) {
    if (toMyt(slot.starts_at).getHours() < 12) morning.push(slot)
    else evening.push(slot)
  }
  return { morning, evening }
}

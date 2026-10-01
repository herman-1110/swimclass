import type { Slot } from '@/entities/slot'
import { addDays, type DateKey } from '@/shared/lib/time'

/** One week's start times as far as they are known: still loading, failed, or the rows. */
export type WeekProbe = readonly Pick<Slot, 'day' | 'ok' | 'reason'>[] | 'pending' | 'error'

/** Whether a week still has a start that hasn't passed: a row whose reason isn't `past`. */
export function hasFutureStart(slots: readonly Pick<Slot, 'reason'>[]): boolean {
  return slots.some((slot) => slot.reason !== 'past')
}

/** The first date from `from` on that has a free start, or null. */
export function firstFreeDay(
  slots: readonly Pick<Slot, 'day' | 'ok'>[],
  from: DateKey,
): DateKey | null {
  let first: DateKey | null = null
  for (const slot of slots) {
    if (slot.ok && slot.day >= from && (first === null || slot.day < first)) first = slot.day
  }
  return first
}

/** Whether the opening day needs next week's start times: this week has nothing left. */
export function needsNextWeek(
  thisWeek: WeekProbe,
  nextWeekStart: DateKey,
  lastWeek: DateKey,
): boolean {
  return Array.isArray(thisWeek) && !hasFutureStart(thisWeek) && nextWeekStart <= lastWeek
}

type DefaultDayInput = {
  today: DateKey
  /** The Monday of today's week, and of the last week the navigation offers. */
  thisWeek: DateKey
  lastWeek: DateKey
  thisWeekSlots: WeekProbe
  /** Next week's, asked for only when needsNextWeek says so ('pending' otherwise). */
  nextWeekSlots: WeekProbe
}

/** The week to show and the day to choose; day is null while it can't be told yet. */
export type DefaultDay = { weekStart: DateKey; day: DateKey | null }

/**
 * Book's opening day when the address names none (prompt 06 TASK 3; book spec §1.5): today's
 * week, or next week when every start this week has passed; then the first day from today
 * (or that Monday) with a free start, else today (or that Monday). At Sat 26 Sep 12:00 the
 * seed gives Sun 27 Sep. If this week's start times fail to load, today, so the start
 * times show the error and its Try again.
 */
export function defaultDay({
  today,
  thisWeek,
  lastWeek,
  thisWeekSlots,
  nextWeekSlots,
}: DefaultDayInput): DefaultDay {
  if (thisWeekSlots === 'pending') return { weekStart: thisWeek, day: null }
  if (thisWeekSlots === 'error') return { weekStart: thisWeek, day: today }
  const nextWeek = addDays(thisWeek, 7)
  if (!needsNextWeek(thisWeekSlots, nextWeek, lastWeek)) {
    return { weekStart: thisWeek, day: firstFreeDay(thisWeekSlots, today) ?? today }
  }
  if (nextWeekSlots === 'pending') return { weekStart: nextWeek, day: null }
  if (nextWeekSlots === 'error') return { weekStart: nextWeek, day: nextWeek }
  return { weekStart: nextWeek, day: firstFreeDay(nextWeekSlots, nextWeek) ?? nextWeek }
}

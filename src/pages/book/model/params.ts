import { addDays, type DateKey, parseDateKey } from '@/shared/lib/time'

// Book's address keeps its choices (ARCHITECTURE §3.6; book spec §1.4): ?group (a group id),
// ?day (an MYT date), ?length (minutes) and ?time ("19:30", MYT). A value that doesn't fit
// falls back silently: never an error.

/** What the address asks for, each part read on its own (null when missing or malformed). */
export type BookParams = {
  group: string | null
  day: DateKey | null
  length: number | null
  time: string | null
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const MINUTES = /^[1-9]\d{0,3}$/

const realDate = parseDateKey

/** Reads ?group, ?day, ?length and ?time, dropping any that are malformed. */
export function readBookParams(params: URLSearchParams): BookParams {
  const length = params.get('length')
  const time = params.get('time')
  return {
    group: params.get('group')?.trim() || null,
    day: realDate(params.get('day')),
    length: length !== null && MINUTES.test(length) ? Number(length) : null,
    time: time !== null && TIME.test(time) ? time : null,
  }
}

/** The whole choice, as every change writes it. */
export type BookChoice = {
  group: string
  /** Null while the opening day is still being worked out: left out of the address. */
  day: DateKey | null
  length: number
  /** "19:30", or null for no picked time. */
  time: string | null
}

/**
 * The address's query for a choice: "?group=…&day=2026-09-29&length=60&time=19:30". The
 * colon stays as it is (a query may hold one), so a shared link reads "19:30", not "19%3A30".
 */
export function bookSearch({ group, day, length, time }: BookChoice): string {
  const params = new URLSearchParams({ group })
  if (day !== null) params.set('day', day)
  params.set('length', String(length))
  if (time !== null) params.set('time', time)
  return `?${params.toString().replaceAll('%3A', ':')}`
}

/** The asked group if it is one of the active ones, else the first (book spec §1.5 step 2). */
export function chooseGroup<G extends { group_id: string }>(
  groupId: string | null,
  active: readonly G[],
): G | undefined {
  return active.find((group) => group.group_id === groupId) ?? active[0]
}

/** settings' lesson_lengths, shortest first, each once: the 1 hour / 2 hours choice. */
export function lessonLengths(lengths: readonly number[]): number[] {
  return [...new Set(lengths)].toSorted((a, b) => a - b)
}

/** The asked length if the settings offer it, else the shortest (book spec §1.5 step 3). */
export function chooseLength(length: number | null, lengths: readonly number[]): number {
  return length !== null && lengths.includes(length) ? length : lengths[0]
}

/** A day the address may ask for: from today to the last bookable day (book spec §1.4). */
export function isBookableDay(day: DateKey, today: DateKey, lastBookableDay: DateKey): boolean {
  return today <= day && day <= lastBookableDay
}

/**
 * The day a week before or after shows: the same weekday, or today if that is earlier
 * (book spec §6.6, proposed), and never past the last bookable day.
 */
export function dayInOtherWeek(
  day: DateKey,
  weeks: number,
  today: DateKey,
  lastBookableDay: DateKey,
): DateKey {
  const moved = addDays(day, 7 * weeks)
  if (moved < today) return today
  return moved > lastBookableDay ? lastBookableDay : moved
}

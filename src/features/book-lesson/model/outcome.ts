import { type DateKey, mytDateKey } from '@/shared/lib/time'

import { bookedHeading, bookedWhen } from './booked'

/**
 * What the last press of Book left in the summary: the success panel, or a refusal's
 * words. Each belongs to the choice it was made for (`key`), so any new choice (group, day,
 * length or start time) dismisses it (book spec §4.4, §5.3.2).
 */
export type Outcome =
  | { key: string; kind: 'booked'; heading: string; when: string }
  | { key: string; kind: 'refused'; error: Error }

/** The choice an outcome belongs to: the group, day, length and picked start. */
export function choiceKey(
  groupId: string,
  day: DateKey | null,
  minutes: number,
  startsAt: string | null,
): string {
  return [groupId, day ?? '', minutes, startsAt ?? ''].join('|')
}

/**
 * The success panel for lessons just booked (`weeks` of them). It belongs to the same
 * choice without a start: the page forgets the booked time at once.
 */
export function bookedOutcome(
  booked: { groupId: string; startsAt: string; minutes: number },
  weeks: number,
  names: string,
): Outcome {
  return {
    key: choiceKey(booked.groupId, mytDateKey(booked.startsAt), booked.minutes, null),
    kind: 'booked',
    heading: bookedHeading(booked.startsAt, names),
    when: bookedWhen(booked.startsAt, booked.minutes, weeks),
  }
}

import { type GroupBalance, packageCaption } from '@/entities/balance'
import type { Slot } from '@/entities/slot'
import { toAppError } from '@/shared/api/rpc'
import type { DateKey } from '@/shared/lib/time'

import { bookedHeading, bookedWhen } from './booked'

/**
 * The choice the summary is about: the group, the day, the length and the picked start as
 * the address names it ("19:30"; null for none). The address keeps that start even when the
 * refreshed start times no longer have it.
 */
export type Choice = {
  groupId: string
  day: DateKey | null
  minutes: number
  time: string | null
}

/** The success panel for lessons just booked (book spec §5.3.2). */
export type BookedOutcome = {
  kind: 'booked'
  /** The choice it belongs to (outcomeFits). */
  choice: Choice
  /** "Booked 7:30 pm for Aiman & Sofia": the group booked, whatever is chosen since. */
  heading: string
  /** "Tue 29 Sep · 7:30–8:30 pm", or every date of a weekly booking. */
  when: string
  /** The group booked. */
  groupId: string
  /** The balance row on screen when it was booked: the package line waits for a newer one. */
  balanceBefore: GroupBalance
}

/** book_lesson's refusal of the start pressed (book spec §5.3.3). */
export type RefusedOutcome = {
  kind: 'refused'
  choice: Choice
  error: Error
  /** The start pressed: state B still names it after the refresh has taken it away. */
  slot: Slot
}

/**
 * What the last press of Book left in the summary: the success panel, or a refusal's words.
 * Each belongs to a choice; a new choice it doesn't fit dismisses it for good (followChoice).
 */
export type Outcome = BookedOutcome | RefusedOutcome

/** The choice as one string, to tell when it changes. */
export function choiceKey({ groupId, day, minutes, time }: Choice): string {
  return [groupId, day ?? '', minutes, time ?? ''].join('|')
}

export function sameChoice(a: Choice, b: Choice): boolean {
  return choiceKey(a) === choiceKey(b)
}

/**
 * Whether an outcome still belongs to `choice` (book spec §4.4, §5.3.2). The success panel
 * belongs to the choice it was booked from, and to the same choice once the page has
 * forgotten the booked time. A refusal belongs to the refused start while the address still
 * names it: also once the refreshed start times no longer have it (the coach closed that
 * time), and after invalid_length once the refreshed settings have changed the length.
 */
export function outcomeFits(outcome: Outcome, choice: Choice): boolean {
  const made = outcome.choice
  if (made.groupId !== choice.groupId || made.day !== choice.day) return false
  if (outcome.kind === 'booked') {
    return made.minutes === choice.minutes && (choice.time === null || choice.time === made.time)
  }
  const sameLength =
    made.minutes === choice.minutes || toAppError(outcome.error).code === 'invalid_length'
  return sameLength && choice.time === made.time
}

/**
 * The outcome to keep once the choice is `choice`: the same one while the choice is
 * unchanged, the outcome moved onto the new choice when it still fits, or null. Dismissing
 * for good means going back to an earlier choice shows the plain summary, not the old
 * panel or refusal (book spec §5.3.2 "Any new selection also dismisses the panel").
 */
export function followChoice(outcome: Outcome | null, choice: Choice): Outcome | null {
  if (outcome === null || sameChoice(outcome.choice, choice)) return outcome
  return outcomeFits(outcome, choice) ? { ...outcome, choice } : null
}

/**
 * The success panel for `weeks` lessons just booked from `choice`, named after the group
 * booked (its names as they were when Book was pressed).
 */
export function bookedOutcome(
  booked: { groupId: string; startsAt: string; minutes: number; names: string },
  weeks: number,
  choice: Choice,
  balanceBefore: GroupBalance,
): BookedOutcome {
  return {
    kind: 'booked',
    choice,
    heading: bookedHeading(booked.startsAt, booked.names),
    when: bookedWhen(booked.startsAt, booked.minutes, weeks),
    groupId: booked.groupId,
    balanceBefore,
  }
}

/**
 * The success panel's package line, "Package 4 · 0 used · 3 booked · 1 left to book", from
 * the refreshed balance once it arrives (book spec §5.3.2). The refresh brings a new row;
 * until then, or if it fails, the row is the one from before the booking and the line waits.
 * Null too while the summary shows another group than the one booked.
 */
export function bookedPackageLine(outcome: BookedOutcome, balance: GroupBalance): string | null {
  const refreshed = balance.group_id === outcome.groupId && balance !== outcome.balanceBefore
  return refreshed ? packageCaption(balance) : null
}

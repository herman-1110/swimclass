import type {
  BookedCoachLesson,
  CoachException,
  ExceptionKind,
  TimeRange,
} from '@/entities/schedule'
import { messageFor } from '@/shared/config/messages'
import { formatDateList, joinWithAnd, plural } from '@/shared/lib/format'
import {
  addDays,
  type DateKey,
  formatDay,
  formatRange,
  formatTime,
  mytDateKey,
  toMyt,
} from '@/shared/lib/time'

import { PartlySavedError } from './partlySaved'

// The words of Block time, Open extra time and the week's "Blocked and extra time" list
// (DESIGN §4 "not drawn"; the Schedule spec §3.8, §6.5 and §7.4, all proposed there).

type DialogWords = {
  title: string
  description: string
  /** The primary button, and its label while saving. */
  submit: string
  saving: string
}

/** Each dialog's title, help, and button (the button says what it does, as the title does). */
export const DIALOG_WORDS: Record<ExceptionKind, DialogWords> = {
  closed: {
    title: 'Block time',
    description: 'Customers can’t book blocked time. Your weekly open hours don’t change.',
    submit: 'Block time',
    saving: 'Blocking…',
  },
  open: {
    title: 'Open extra time',
    description:
      'Customers can book this time on this date only. Your weekly open hours don’t change.',
    submit: 'Open extra time',
    saving: 'Opening…',
  },
}

/** Block time's "Until (optional)" help. */
export const UNTIL_HELP = 'For several days in a row. The same hours are blocked each day.'

/** The note's help: notes are the coach's own (TECH_SPEC §6). */
export const NOTE_HELP = 'Only you see this.'

export const NOTE_PLACEHOLDER = 'e.g. Pool maintenance'

/** The longest note add_exception takes (`invalid_note` past it, after trimming). */
export const NOTE_MAX_LENGTH = 500

/** Above the lessons a block leaves booked (prompt 08). */
export const STAY_BOOKED = 'These lessons stay booked:'

/** Under them: what to do about each one. */
export const STAY_BOOKED_HINT =
  'Cancel each one in the schedule if it can’t go ahead. Each cancellation emails the customer.'

/** Extra time that is all inside the open hours already. */
export const ALREADY_OPEN = 'This time is already open.'

/** A lesson a block leaves booked: "Sat 3 Oct, 9:00–10:00 am · Aiman & Sofia". */
export function stayBookedLine(lesson: BookedCoachLesson): string {
  return `${formatDay(lesson.starts_at)}, ${formatRange(lesson.starts_at, lesson.ends_at)} · ${lesson.display_names}`
}

/**
 * Extra time inside a block: "Part of this time is blocked (7:00–9:00 am). Blocked time
 * wins, so it stays closed. Remove the block first."
 */
export function blockedInsideMessage(blocks: readonly TimeRange[]): string {
  const ranges = joinWithAnd(blocks.map((block) => formatRange(block.starts_at, block.ends_at)))
  return `Part of this time is blocked (${ranges}). Blocked time wins, so it stays closed. Remove the block first.`
}

/** The page's notice once saved: "Time blocked.", "Time blocked on 3 days.", "Extra time opened.". */
export function savedNotice(kind: ExceptionKind, days: number): string {
  if (kind === 'open') return 'Extra time opened.'
  return days > 1 ? `Time blocked on ${plural(days, 'day')}.` : 'Time blocked.'
}

/**
 * A range that stopped part way (one call per day): "Blocked Sat 3 Oct and Sun 4 Oct. Mon 5
 * Oct wasn’t blocked: {message}" (the Schedule spec §6.5).
 */
export function partlySavedMessage(
  saved: readonly DateKey[],
  failed: DateKey,
  message: string,
): string {
  return `Blocked ${formatDateList(saved)}. ${formatDateList([failed])} wasn’t blocked: ${message}`
}

/**
 * Why nothing (or not everything) was saved, in the coach's words: the refusal's message,
 * or for a range that stopped part way which days were saved and why the next wasn't.
 */
export function saveErrorMessage(error: unknown): string {
  const words = { audience: 'coach' } as const
  return error instanceof PartlySavedError
    ? partlySavedMessage(error.saved, error.failed, messageFor(error.cause, words))
    : messageFor(error, words)
}

/**
 * When an exception is (the Schedule spec §3.8): "Sat 3 Oct, 7:00–9:00 am"; across midnight
 * "Sun 4 Oct, 8:00 pm – Mon 5 Oct, 9:00 am". Ending at the midnight after its day still
 * reads as that day: "Sun 4 Oct, 8:00 pm–12:00 am".
 */
export function exceptionWhen(exception: TimeRange): string {
  const { starts_at: start, ends_at: end } = exception
  const day = mytDateKey(start)
  const endDay = mytDateKey(end)
  const atMidnight = toMyt(end).getHours() === 0 && toMyt(end).getMinutes() === 0
  if (endDay === day || (endDay === addDays(day, 1) && atMidnight)) {
    return `${formatDay(start)}, ${formatRange(start, end)}`
  }
  return `${formatDay(start)}, ${formatTime(start)} – ${formatDay(end)}, ${formatTime(end)}`
}

/** What it is, with the coach's note: "Blocked · Pool maintenance", "Extra time". */
export function exceptionLine(exception: Pick<CoachException, 'kind' | 'note'>): string {
  const what = exception.kind === 'closed' ? 'Blocked' : 'Extra time'
  const note = exception.note?.trim()
  return note ? `${what} · ${note}` : what
}

/** Remove's full name, after "Remove ": "blocked time, Sat 3 Oct, 7:00–9:00 am". */
export function removeExceptionName(exception: CoachException): string {
  const what = exception.kind === 'closed' ? 'blocked time' : 'extra time'
  return `${what}, ${exceptionWhen(exception)}`
}

/** The page's notice once removed: "Blocked time removed." / "Extra time removed.". */
export function removedNotice(kind: ExceptionKind): string {
  return kind === 'closed' ? 'Blocked time removed.' : 'Extra time removed.'
}

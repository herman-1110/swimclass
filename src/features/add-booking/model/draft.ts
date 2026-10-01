import type { CoachSlotCheckArgs } from '@/entities/slot'
import { addDays, type DateKey, mytInstant } from '@/shared/lib/time'

import type { CoachBookInput } from '../api/useCoachBook'

// The Add booking form's inputs and what they become (DESIGN §4 "not drawn"; prompt 08
// TASK 5; the Schedule spec §7.4). The database checks everything again when it books.

/** "Number of weeks": 2 to 52, so `invalid_repeat` can't happen (the Schedule spec §9 C14). */
export const MIN_REPEAT_WEEKS = 2
export const MAX_REPEAT_WEEKS = 52

export type BookingDraft = {
  /** The chosen group (an active one), or null. */
  groupId: string | null
  /** The date field's "yyyy-MM-dd": any day, past ones too (they count as used). */
  date: DateKey
  /** The start field's "HH:mm", or "" until chosen. */
  start: string
  /** The length in minutes, from settings.lesson_lengths; null for the first of them. */
  minutes: number | null
  /** "Repeat weekly". */
  repeat: boolean
  /** "Number of weeks" as typed. */
  weeks: string
  /** "Outside open hours": skips open hours and start steps (p_ignore_open_hours). */
  ignoreOpenHours: boolean
  /** "Skip travel gap" (p_gap_override). */
  gapOverride: boolean
}

/** A fresh form (the Schedule spec §6.4): on `date`, the first length, no start, no repeat. */
export function newDraft(date: DateKey): BookingDraft {
  return {
    groupId: null,
    date,
    start: '',
    minutes: null,
    repeat: false,
    weeks: String(MIN_REPEAT_WEEKS),
    ignoreOpenHours: false,
    gapOverride: false,
  }
}

/** Whether the patch changes anything: leaving a field as it was changes nothing. */
export function changesDraft(draft: BookingDraft, patch: Partial<BookingDraft>): boolean {
  return (Object.keys(patch) as (keyof BookingDraft)[]).some((key) => patch[key] !== draft[key])
}

/** What `coach_book` is asked, apart from "Book anyway" (ignoreCredit). */
export type BookingRequest = Omit<CoachBookInput, 'ignoreCredit'>

/**
 * Whether a refusal of `asked` is about `now`: the same group, start, length, weeks and
 * options. "Book anyway" books past the group's credit, so it may only ever repeat what
 * `coach_book` refused.
 */
export function sameBooking(
  asked: BookingRequest | undefined,
  now: BookingRequest | null,
): boolean {
  if (!asked || !now) return false
  return (
    asked.groupId === now.groupId &&
    asked.startsAt === now.startsAt &&
    asked.minutes === now.minutes &&
    asked.repeatWeeks === now.repeatWeeks &&
    asked.ignoreOpenHours === now.ignoreOpenHours &&
    asked.gapOverride === now.gapOverride
  )
}

/** The start as a moment, or null while the date or time is missing or not real. */
export function startOf(draft: Pick<BookingDraft, 'date' | 'start'>): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^\d{2}:\d{2}$/.test(draft.start)) return null
  try {
    return mytInstant(draft.date, draft.start)
  } catch {
    return null
  }
}

/** When it ends: the start plus the length. */
export function endOf(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000)
}

/** The last week's start when repeating `weeks` times: the same time, 7 days apart. */
export function lastStartOf(draft: Pick<BookingDraft, 'date' | 'start'>, weeks: number) {
  const start = startOf(draft)
  if (start === null) return null
  return startOf({ date: addDays(draft.date, 7 * (weeks - 1)), start: draft.start })
}

/** What keeps the form from booking: the button says so in its label (the Schedule spec §6.4). */
export type BookBlocker = 'group' | 'start' | 'length' | 'weeks' | 'clash'

/**
 * The first thing missing, in the order the coach fills the form in, or null when it can
 * book: a group, a start, the length (until the settings are in), a number of weeks the
 * database takes, and a time the live check didn't refuse. The database checks again.
 */
export function bookBlocker(state: {
  hasGroup: boolean
  start: Date | null
  minutes: number | null
  weeks: number | null
  /** The live check's answer for the latest input is a clash. */
  clash: boolean
}): BookBlocker | null {
  if (!state.hasGroup) return 'group'
  if (state.start === null) return 'start'
  if (state.minutes === null) return 'length'
  if (state.weeks === null) return 'weeks'
  return state.clash ? 'clash' : null
}

/** How many weeks to book: 1 without repeat; null while "Number of weeks" isn't 2 to 52. */
export function weeksOf(draft: Pick<BookingDraft, 'repeat' | 'weeks'>): number | null {
  if (!draft.repeat) return 1
  if (!/^\d+$/.test(draft.weeks.trim())) return null
  const weeks = Number(draft.weeks)
  return weeks >= MIN_REPEAT_WEEKS && weeks <= MAX_REPEAT_WEEKS ? weeks : null
}

/**
 * "Number of weeks" once the field is left: back inside 2 to 52 (empty or unreadable → 2),
 * so a slip of the keyboard never books a different number than shown.
 */
export function clampWeeks(text: string): string {
  const weeks = Number.parseInt(text, 10)
  if (Number.isNaN(weeks)) return String(MIN_REPEAT_WEEKS)
  return String(Math.min(MAX_REPEAT_WEEKS, Math.max(MIN_REPEAT_WEEKS, weeks)))
}

/**
 * The live check's input (`coach_slot_check`, first week only) with the length chosen, or
 * null until it can ask.
 */
export function checkArgs(draft: BookingDraft, minutes: number | null): CoachSlotCheckArgs | null {
  const start = startOf(draft)
  if (draft.groupId === null || start === null || minutes === null) return null
  return {
    p_group_id: draft.groupId,
    p_starts_at: start.toISOString(),
    p_minutes: minutes,
    p_ignore_open_hours: draft.ignoreOpenHours,
    p_gap_override: draft.gapOverride,
  }
}

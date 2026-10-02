import { type GroupBalance, isUnpaidAfter, nextPaymentPackageNo } from '@/entities/balance'
import type { Group } from '@/entities/group'
import { formatDayKey } from '@/entities/schedule'
import { clashMessage, type Slot, unavailableTitle } from '@/entities/slot'
import { toAppError } from '@/shared/api/rpc'
import { messageFor, type MessageOptions } from '@/shared/config/messages'
import { formatHours, plural } from '@/shared/lib/format'
import { formatRange, formatTime, toMyt } from '@/shared/lib/time'

import { newLessonPosition } from './position'
import { lessonsPerBooking } from './repeatWeeks'

// The booking summary's words (book spec §5.2.5; design/Main.dc.html's script, :341-370,
// adapted to real data). Previews only: book_lesson decides, and its refusals come back
// through `refusal`.

export type SummaryState = {
  /** 16 px 600: "Tue 29 Sep · 7:30–8:30 pm", "7:00 pm isn’t available", "Pick a start time". */
  title: string
  /** 13 px line under the title: what the booking uses, or why it can't go ahead. */
  useLine: string
  /** warn for a clash, the credit limit or a refusal (DESIGN §1: orange needs attention). */
  useTone: 'muted' | 'warn'
  /** The button says what it does: "Book 7:30 pm for Aiman & Sofia", "Pick a time". */
  buttonLabel: string
  /** Book can be pressed. Otherwise the button is aria-disabled (it keeps focus). */
  canBook: boolean
  /** The "Repeat weekly" checkbox shows (N > 1, and the start can be booked). */
  showRepeat: boolean
}

/** State A: nothing picked yet. Also the summary's look while the screen loads. */
export const PICK_A_TIME: SummaryState = {
  title: 'Pick a start time',
  useLine: 'Crossed-out times clash with another lesson or travel time.',
  useTone: 'muted',
  buttonLabel: 'Pick a time',
  canBook: false,
  showRepeat: false,
}

// The refusals that mean the start itself can't be booked (slot_check's reasons): state B
// with the server's reason, as a crossed-out chip explains itself (book spec §5.3.3).
const START_REFUSALS: ReadonlySet<string> = new Set([
  'past',
  'outside_window',
  'invalid_length',
  'off_step',
  'outside_open_hours',
  'overlap_mine',
  'overlap_other',
  'gap_after',
  'gap_before',
])

export type SummaryInput = {
  /** The picked start, free or crossed out, or null. */
  slot: Slot | null
  minutes: number
  group: Pick<Group, 'display_names' | 'type_label'>
  balance: Pick<
    GroupBalance,
    | 'package_size'
    | 'package_no'
    | 'left_in_package'
    | 'paid_lessons'
    | 'used_lessons'
    | 'booked_lessons'
    | 'can_still_book'
  >
  /**
   * Lessons of the group already booked that start before the picked one (lessonsBookedBefore),
   * or null while they aren't known: the lesson is then taken to come after all of them.
   */
  bookedBefore: number | null
  /** How many weeks "Repeat weekly" would book (repeatWeeks). */
  repeatWeeks: number
  /** book_lesson's last refusal for this very selection, or null. */
  refusal: unknown
  /** `{ gapMinutes, windowWeeks }` from settings, for the reasons' words. */
  messages: MessageOptions
}

/** When a lesson of `minutes` starting at `startsAt` ends (MYT has no daylight saving). */
export function lessonEnd(startsAt: string, minutes: number): Date {
  return new Date(toMyt(startsAt).getTime() + minutes * 60_000)
}

/** "Tue 29 Sep · 7:30–8:30 pm": the picked lesson's day and time. */
export function lessonTitle(slot: Pick<Slot, 'day' | 'starts_at'>, minutes: number): string {
  return `${formatDayKey(slot.day)} · ${formatRange(slot.starts_at, lessonEnd(slot.starts_at, minutes))}`
}

/**
 * What a free start uses (states C and D), in the package the ledger will put it in (it
 * counts after the lessons used and the booked ones that start before it: newLessonPosition).
 * "1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this" while
 * the current package has room (", completes the package" when this booking fills it), or the
 * later package it goes into; a 2-hour lesson across two packages: "uses 2 lessons: the last
 * of Package 1 and the first of Package 2" (C18). ", not paid yet" when a lesson it uses isn't
 * paid for, also in a package with room (a package used up exactly, or never paid); when it is
 * paid but moves a lesson booked after it past what is paid, " · Package 3 isn’t paid yet"
 * (that package's words on My classes). `bookedBefore` defaults to every booked lesson.
 */
export function usageLine(
  group: SummaryInput['group'],
  balance: SummaryInput['balance'],
  lessons: number,
  bookedBefore: number = balance.booked_lessons,
): string {
  const who = `${group.type_label} for ${group.display_names} · uses ${plural(lessons, 'lesson')}`
  const size = balance.package_size
  const place = newLessonPosition(balance, bookedBefore, lessons)
  const lastLesson = (place.package_no - 1) * size + place.lesson_in_package + lessons - 1
  const notPaid = lastLesson > balance.paid_lessons ? ', not paid yet' : ''
  const later =
    !notPaid && isUnpaidAfter(balance, lessons)
      ? ` · Package ${nextPaymentPackageNo(balance)} isn’t paid yet`
      : ''
  if (place.lesson_in_package + lessons - 1 > size) {
    return `${who}: the last of Package ${place.package_no} and the first of Package ${place.package_no + 1}${notPaid}${later}`
  }
  // Lessons left to book in the current package once this one is in (book spec §5.2.5 C).
  const roomBefore = place.package_no === balance.package_no && balance.left_in_package > 0
  const after = place.package_no * size - balance.used_lessons - balance.booked_lessons - lessons
  const rest = !roomBefore
    ? ''
    : after > 0
      ? `, ${after} left to book after this`
      : ', completes the package'
  return `${who} from Package ${place.package_no}${notPaid}${rest}${later}`
}

/**
 * The summary for the current selection (book spec §5.2.5): A nothing picked, B a crossed-out
 * start (or the server's clash), E too little credit, a refusal's words (repeat_conflict,
 * credit_exceeded, group_inactive, network …), or C/D a start that can be booked.
 */
export function bookingSummaryState(input: SummaryInput): SummaryState {
  const { slot, minutes, group, balance, refusal, messages } = input
  if (slot === null) return PICK_A_TIME

  const code = refusal === null || refusal === undefined ? null : toAppError(refusal).code
  if (code !== null && START_REFUSALS.has(code)) {
    return unavailable(slot, messageFor(refusal, messages))
  }
  if (!slot.ok) return unavailable(slot, clashMessage(slot, messages) ?? messageFor(null))

  const lessons = lessonsPerBooking(minutes)
  const title = lessonTitle(slot, minutes)
  if (balance.can_still_book < lessons) {
    return {
      title,
      useLine: messageFor({ code: 'credit_exceeded' }),
      useTone: 'warn',
      buttonLabel: 'Pay for the current package first',
      canBook: false,
      showRepeat: false,
    }
  }

  const buttonLabel = `Book ${formatTime(slot.starts_at)} for ${group.display_names}`
  const showRepeat = input.repeatWeeks > 1
  if (code !== null) {
    // group_inactive can't succeed until the selection changes; the rest may be retried.
    const canBook = code !== 'group_inactive'
    const reason = messageFor(refusal, messages)
    return { title, useLine: reason, useTone: 'warn', buttonLabel, canBook, showRepeat }
  }
  const uses = usageLine(group, balance, lessons, input.bookedBefore ?? balance.booked_lessons)
  return { title, useLine: uses, useTone: 'muted', buttonLabel, canBook: true, showRepeat }
}

function unavailable(slot: Pick<Slot, 'starts_at'>, reason: string): SummaryState {
  return {
    title: unavailableTitle(slot),
    useLine: reason,
    useTone: 'warn',
    buttonLabel: 'Pick a free time',
    canBook: false,
    showRepeat: false,
  }
}

/**
 * The line under the button (DESIGN §4 item 7): "Free to cancel or reschedule up to 6 hours
 * before.", from settings' cancel_cutoff_hours (CLAUDE.md rule 9). With no cutoff: "Free
 * to cancel or reschedule until the lesson starts." (book spec Q16).
 */
export function cancelPolicyNote(cutoffHours: number): string {
  return cutoffHours > 0
    ? `Free to cancel or reschedule up to ${formatHours(cutoffHours)} before.`
    : 'Free to cancel or reschedule until the lesson starts.'
}

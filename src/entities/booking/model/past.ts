import { formatDayMonth, type Instant } from '@/shared/lib/time'

import { packagePosition } from './position'
import type { GroupLesson, PastLesson, PastLessonStatus } from './types'

// Lessons that are over or off (my-classes spec §2.7, §5.2 Past lesson row; the coach's
// History, coach-students spec §3.9).

const PAST_LABELS: Record<PastLessonStatus, string> = {
  done: 'Done',
  cancelled: 'Cancelled',
  excused: 'Excused',
}

/** A past row's right side: "Done", "Cancelled" or "Excused". */
export function pastStatusLabel(status: PastLessonStatus): string {
  return PAST_LABELS[status]
}

/**
 * A past row's second line: "Wei Jie · 1-to-1 · Package 2, lesson 2 of 4" for a done lesson,
 * "Wei Jie · 1-to-1" for a cancelled or excused one.
 */
export function pastLessonDetail(
  lesson: Pick<PastLesson, 'position'>,
  names: string,
  typeLabel: string,
  packageSize: number,
): string {
  const group = `${names} · ${typeLabel}`
  return lesson.position ? `${group} · ${packagePosition(lesson.position, packageSize)}` : group
}

/**
 * A past row's note, or null for a done lesson: "Cancelled by you on 26 Sep.", "Cancelled by
 * your coach on 26 Sep. Reason: Pool closed", "Your coach excused it, so it doesn’t count."
 * `myAccountId` tells the customer's own cancellations from the coach's.
 */
export function pastLessonNote(
  lesson: Pick<PastLesson, 'status' | 'cancelled_at' | 'cancelled_by' | 'cancel_reason'>,
  myAccountId: string | null,
  now?: Instant,
): string | null {
  if (lesson.status === 'excused') return 'Your coach excused it, so it doesn’t count.'
  if (lesson.status !== 'cancelled') return null
  const who =
    lesson.cancelled_by !== null && lesson.cancelled_by === myAccountId ? 'you' : 'your coach'
  const on = lesson.cancelled_at ? ` on ${formatDayMonth(lesson.cancelled_at, now)}` : ''
  const reason =
    who === 'your coach' && lesson.cancel_reason ? ` Reason: ${lesson.cancel_reason}` : ''
  return `Cancelled by ${who}${on}.${reason}`
}

/** A lesson of the coach's History: booked and ahead, used (ended), cancelled or excused. */
export type GroupLessonState = 'booked' | 'used' | 'cancelled' | 'excused'

export function groupLessonState(lesson: Pick<GroupLesson, 'status' | 'used'>): GroupLessonState {
  if (lesson.status !== 'booked') return lesson.status
  return lesson.used ? 'used' : 'booked'
}

const STATE_LABELS: Record<GroupLessonState, string> = {
  booked: 'Booked',
  used: 'Used',
  cancelled: 'Cancelled',
  excused: 'Excused',
}

/**
 * The History row's second line (coach-students spec §8): "Booked · Package 6 · lesson 2 of
 * 4", "Used · Package 2 · lesson 1 of 4", "Cancelled", "Excused".
 */
export function historyLessonLine(
  lesson: Pick<GroupLesson, 'status' | 'used' | 'position'>,
  packageSize: number,
): string {
  const label = STATE_LABELS[groupLessonState(lesson)]
  return lesson.status === 'booked' && lesson.position
    ? `${label} · ${packagePosition(lesson.position, packageSize, ' · ')}`
    : label
}

/** The History row's third line: "Palm Court", or "Palm Court · Gap override". */
export function historyPlaceLine(lesson: Pick<GroupLesson, 'location' | 'gap_override'>): string {
  return lesson.gap_override ? `${lesson.location} · Gap override` : lesson.location
}

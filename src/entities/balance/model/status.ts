import { formatDay, formatDayMonth, type Instant, mytDateKey, toMyt } from '@/shared/lib/time'

import { nextPaymentPackageNo } from './packages'
import type { GroupBalance } from './types'

// Paid or unpaid, and what needs the coach's attention (DESIGN §4 Students & payments; the
// coach-students spec §5.2; the coach-schedule spec §3.6). The flags are the database's own.

/**
 * Where a group sorts on the coach's screens: unpaid first, then on its last paid lesson,
 * then the rest (the view never sets both flags).
 */
export type BalanceBucket = 'unpaid' | 'last-lesson' | 'paid'

export function balanceBucket(
  balance: Pick<GroupBalance, 'unpaid' | 'last_lesson_at'>,
): BalanceBucket {
  if (balance.unpaid) return 'unpaid'
  return balance.last_lesson_at === null ? 'paid' : 'last-lesson'
}

/** The Students table's status: the pill's word and the note under it. */
export type BalanceStatusInfo = {
  label: 'Paid' | 'Unpaid'
  /** "Starts today", "Since 18 Sep", "Last lesson 1 Oct", "New student", or null. */
  note: string | null
  /** warn only for "Last lesson …". */
  noteTone: 'muted' | 'warn'
}

/**
 * The status pill and its note (coach-students spec §5.2.4), as of `now`:
 * - unpaid: "Since 18 Sep" once the first unpaid lesson's day has passed, "Starts today" /
 *   "Since today" on its day, "Starts 3 Oct" before it, "From starting balance" when that
 *   lesson is in the starting balance
 * - paid, on the last paid lesson: "Last lesson 1 Oct" ("Last lesson today"), in orange
 * - paid, no lesson used yet: "New student"
 */
export function balanceStatus(balance: GroupBalance, now: Instant): BalanceStatusInfo {
  const today = mytDateKey(now)
  if (balance.unpaid) {
    return {
      label: 'Unpaid',
      note: unpaidNote(balance.unpaid_since, now, today),
      noteTone: 'muted',
    }
  }
  if (balance.last_lesson_at !== null) {
    const day =
      mytDateKey(balance.last_lesson_at) === today
        ? 'today'
        : formatDayMonth(balance.last_lesson_at, now)
    return { label: 'Paid', note: `Last lesson ${day}`, noteTone: 'warn' }
  }
  return {
    label: 'Paid',
    note: balance.used_lessons === 0 ? 'New student' : null,
    noteTone: 'muted',
  }
}

function unpaidNote(since: string | null, now: Instant, today: string): string {
  if (since === null) return 'From starting balance'
  const day = mytDateKey(since)
  if (day < today) return `Since ${formatDayMonth(since, now)}`
  if (day > today) return `Starts ${formatDayMonth(since, now)}`
  return toMyt(since).getTime() > toMyt(now).getTime() ? 'Starts today' : 'Since today'
}

/**
 * Needs attention's line for an unpaid group (coach-schedule spec §3.6): "Package 6 unpaid",
 * plus the lessons already used past what's paid: "Package 2 unpaid · 2 used".
 */
export function unpaidPackageLabel(
  balance: Pick<GroupBalance, 'package_size' | 'paid_lessons' | 'used_lessons'>,
): string {
  const owed = balance.used_lessons - balance.paid_lessons
  const label = `Package ${nextPaymentPackageNo(balance)} unpaid`
  return owed > 0 ? `${label} · ${owed} used` : label
}

/**
 * Needs attention's line for a group on its last paid lesson (coach-schedule spec §3.6):
 * "Last lesson of Package 4 on Thu 1 Oct", or null when it isn't.
 */
export function lastLessonLabel(
  balance: Pick<GroupBalance, 'package_size' | 'paid_lessons' | 'last_lesson_at'>,
): string | null {
  if (balance.last_lesson_at === null) return null
  const packageNo = Math.ceil(balance.paid_lessons / balance.package_size)
  return `Last lesson of Package ${packageNo} on ${formatDay(balance.last_lesson_at)}`
}

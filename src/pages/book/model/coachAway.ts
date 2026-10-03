import type { TimeRange } from '@/entities/schedule'
import { COACH_AWAY_DAY_MESSAGE, coachAwayMessage } from '@/shared/config/messages'
import { formatRange } from '@/shared/lib/time'

export type CoachAway = {
  text: string
  /** Block time left no open hours: the line takes the fully-booked line's place. */
  wholeDay: boolean
}

/**
 * Book's line for time the coach blocked on the chosen day (Herman, 2 Oct 2026; triage
 * question 3): Block time leaves no start times there, so this says why. From week_busy's
 * day: with no open hours left, "Your coach isn’t available on this day. Try another day.";
 * otherwise each blocked range, "Your coach isn’t available 9:00 am–12:00 pm." Null without
 * blocked time.
 */
export function coachAwayText(day: {
  open: readonly TimeRange[]
  closed: readonly TimeRange[]
}): CoachAway | null {
  if (day.closed.length === 0) return null
  if (day.open.length === 0) return { text: COACH_AWAY_DAY_MESSAGE, wholeDay: true }
  const ranges = day.closed.map((range) => formatRange(range.starts_at, range.ends_at))
  return { text: coachAwayMessage(ranges), wholeDay: false }
}

import { formatHours } from '@/shared/lib/format'
import { formatDay, formatTime, type Instant, toMyt } from '@/shared/lib/time'

// Whether an upcoming lesson can still be cancelled (BR-15; my-classes spec §5.2). A preview
// only: cancel_booking decides, and answers `locked` when the cutoff has passed.

const HOUR_MS = 60 * 60 * 1000

/**
 * open: the Cancel button, until the cutoff. locked: under cancel_cutoff_hours to go.
 * started: the lesson has begun (with a 0-hour cutoff, the only way it closes).
 */
export type CancelState = 'open' | 'locked' | 'started'

/**
 * The last moment the customer may cancel: the start less cancel_cutoff_hours. MYT has no
 * daylight saving, so it is the same instant the database uses (`cutoff_at`).
 */
export function cancelDeadline(startsAt: Instant, cutoffHours: number): Date {
  return new Date(toMyt(startsAt).getTime() - cutoffHours * HOUR_MS)
}

/** Where a lesson stands at `now`: open up to and at the deadline, as the database allows. */
export function cancelState(startsAt: Instant, now: Instant, cutoffHours: number): CancelState {
  const at = toMyt(now).getTime()
  if (at <= cancelDeadline(startsAt, cutoffHours).getTime()) return 'open'
  return at >= toMyt(startsAt).getTime() ? 'started' : 'locked'
}

/**
 * The note under an upcoming row (MyClasses.dc.html:67, :78), for its state:
 * "Free to cancel until 3:00 am, Sat 3 Oct.", "Under 6 hours to go, so it can’t be cancelled
 * and counts even if missed.", or "It has started, so it can’t be cancelled and counts even if
 * missed."
 */
export function cancelNote(state: CancelState, startsAt: Instant, cutoffHours: number): string {
  if (state === 'open') {
    const deadline = cancelDeadline(startsAt, cutoffHours)
    return `Free to cancel until ${formatTime(deadline)}, ${formatDay(deadline)}.`
  }
  if (state === 'locked') {
    return `Under ${formatHours(cutoffHours)} to go, so it can’t be cancelled and counts even if missed.`
  }
  return 'It has started, so it can’t be cancelled and counts even if missed.'
}

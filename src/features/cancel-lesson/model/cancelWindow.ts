import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'
import { formatHours } from '@/shared/lib/format'
import { formatDay, formatTime, type Instant, toMyt } from '@/shared/lib/time'

import { cancelLessonWords } from './words'

/**
 * Whether a customer can still cancel a lesson, as My classes shows it (BR-15): `open` until
 * the deadline, then `locked`, and `started` once the lesson has begun. A preview only: the
 * database decides, and refuses with `locked` (CLAUDE.md rule 1).
 */
export type CancelState = 'open' | 'locked' | 'started'

const HOUR_MS = 60 * 60 * 1000

/**
 * The last moment a customer may cancel: the start minus `cancel_cutoff_hours`, the same
 * instant the database computes (`cancel_booking`). MYT has no daylight saving, so an hour
 * is always 3,600 seconds.
 */
export function cancelDeadline(startsAt: Instant, cutoffHours: number): Date {
  return new Date(toMyt(startsAt).getTime() - cutoffHours * HOUR_MS)
}

/** The state at `now` (the database refuses only after the deadline, so the deadline itself is still open). */
export function cancelState(startsAt: Instant, cutoffHours: number, now: Instant): CancelState {
  const at = toMyt(now).getTime()
  if (at <= cancelDeadline(startsAt, cutoffHours).getTime()) return 'open'
  return at >= toMyt(startsAt).getTime() ? 'started' : 'locked'
}

/**
 * The note under an upcoming lesson (MyClasses.dc.html; the My classes spec §5.2):
 * "Free to cancel until 3:00 am, Sat 3 Oct.", "Under 6 hours to go, so it can’t be
 * cancelled and counts even if missed." or, once it has begun, "It has started, so it
 * can’t be cancelled and counts even if missed."
 */
export function cancelNote(
  startsAt: Instant,
  cutoffHours: number,
  now: Instant,
  language: Language = 'en',
): string {
  const w = wordsIn(cancelLessonWords, language)
  switch (cancelState(startsAt, cutoffHours, now)) {
    case 'open': {
      const deadline = cancelDeadline(startsAt, cutoffHours)
      return w.openNote(formatTime(deadline, language), formatDay(deadline, language))
    }
    case 'locked':
      return w.lockedNote(formatHours(cutoffHours, language))
    case 'started':
      return w.startedNote
  }
}

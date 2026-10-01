import type { Group } from '@/entities/group'
import { formatMinutes, plural } from '@/shared/lib/format'
import { formatDay, formatRange, formatTime } from '@/shared/lib/time'

import type { BookBlocker } from './draft'

// The words of Add booking (DESIGN §4 "not drawn"; the Schedule spec §6.4 and §7.4, where
// the strings not in DESIGN are marked proposed). Errors come from messages.ts.

/** Under the title: no email goes to the customer (DESIGN §4). */
export const NO_EMAIL = 'The customer isn’t emailed.'

export const SEARCH_PLACEHOLDER = 'Search by student or account name'

/** "Number of weeks"' help. */
export const REPEAT_HELP = 'The same time each week. Nothing is booked if any week clashes.'

/** While repeating, under the reason: DESIGN §4 "the clash reason covers the first week only". */
export const FIRST_WEEK_ONLY =
  'Only the first week is checked now. The other weeks are checked when you book.'

/** "Outside open hours" when on. */
export const OUTSIDE_HOURS_WARNING = 'Open hours and start times aren’t checked for this lesson.'

/** A start that has passed (DESIGN §4: a past lesson counts as used). */
export const PAST_WARNING = 'This time has passed. The lesson counts as used.'

/** "Skip travel gap" when on: "You may have less than 1 hour to travel before or after this lesson." */
export function skipGapWarning(gapMinutes: number): string {
  return `You may have less than ${formatMinutes(gapMinutes)} to travel before or after this lesson.`
}

/** The search found nothing: "No active group matches “zz”." */
export function noMatch(query: string): string {
  return `No active group matches “${query.trim()}”.`
}

/** No active group at all (not in the seed; proposed). */
export const NO_GROUPS = 'No active groups.'

// Why the primary button can't book yet, as its label (the Schedule spec §6.4).
const BLOCKED_LABELS: Record<BookBlocker, string> = {
  group: 'Pick a group',
  start: 'Pick a start time',
  // Only while the settings (the lesson lengths) load, or after they failed to.
  length: 'Pick a length',
  // The number field is back inside 2 to 52 once left; this shows only while typing.
  weeks: 'Choose 2 to 52 weeks',
  clash: 'Pick a free time',
}

export function blockedLabel(blocker: BookBlocker): string {
  return BLOCKED_LABELS[blocker]
}

/** The button once it can book: "Book 7:30 pm for Aiman & Sofia", "Book 3 weeks for Aiman & Sofia". */
export function bookLabel(start: Date, weeks: number, names: string): string {
  return weeks > 1
    ? `Book ${plural(weeks, 'week')} for ${names}`
    : `Book ${formatTime(start)} for ${names}`
}

/**
 * The primary button's words: "Booking…" while it books, what is missing ("Pick a free
 * time"), "Book anyway" after `credit_exceeded`, otherwise what it books.
 */
export function primaryLabel(state: {
  blocker: BookBlocker | null
  pending: boolean
  creditRefused: boolean
  start: Date | null
  weeks: number | null
  names: string
}): string {
  const { blocker, start, weeks } = state
  if (state.pending) return 'Booking…'
  if (blocker !== null || start === null || weeks === null) return blockedLabel(blocker ?? 'group')
  return state.creditRefused ? 'Book anyway' : bookLabel(start, weeks, state.names)
}

/** The summary's first line: "Tue 29 Sep · 7:30–8:30 pm". */
export function summaryWhen(start: Date, end: Date): string {
  return `${formatDay(start)} · ${formatRange(start, end)}`
}

/** The summary's second line: "Aiman & Sofia · 1-to-2 · Palm Court". */
export function summaryGroup(group: Pick<Group, 'display_names' | 'type_label' | 'location'>) {
  return `${group.display_names} · ${group.type_label} · ${group.location}`
}

/** While repeating: "Every week for 3 weeks, until Tue 13 Oct" (`last` is the last week's start). */
export function summaryRepeat(weeks: number, last: Date): string {
  return `Every week for ${plural(weeks, 'week')}, until ${formatDay(last)}`
}

/**
 * The page's notice once booked: "Booked Tue 29 Sep, 7:30–8:30 pm for Aiman & Sofia." or
 * "Booked 3 weeks for Aiman & Sofia from Tue 29 Sep."
 */
export function bookedNotice(start: Date, end: Date, weeks: number, names: string): string {
  return weeks > 1
    ? `Booked ${plural(weeks, 'week')} for ${names} from ${formatDay(start)}.`
    : `Booked ${formatDay(start)}, ${formatRange(start, end)} for ${names}.`
}

import { plural } from '@/shared/lib/format'

import type { StudentsFilter } from './rows'

// The page's own words (coach-students §6, §7; coach-add-students §5.2.1; proposed).

/** After Add students (`?added=`): "3 students added", "Student added". */
export function studentsAdded(size: number): string {
  return size === 1 ? 'Student added' : `${size} students added`
}

/** The All tab with no groups at all (coach-students §6). */
export const NO_STUDENTS_YET = 'No students yet'

/** What a tab with nothing to show says (coach-students §6, proposed). */
export const EMPTY_TAB: Record<Exclude<StudentsFilter, 'all'>, string> = {
  unpaid: 'No unpaid packages.',
  'last-lesson': 'No one is on their last lesson.',
  paid: 'No paid packages.',
  waiting: 'No accounts are waiting for approval.',
}

/** A search that matches nothing: "No students match “zz”.", "No accounts match “zz”.". */
export function noMatchText(filter: StudentsFilter, query: string): string {
  const what = filter === 'waiting' ? 'accounts' : 'students'
  return `No ${what} match “${query.trim()}”.`
}

/**
 * What a polite live region says after the tab or the search changes (coach-students §7):
 * "13 packages", or on the Waiting tab "1 account". With nothing to show, "No packages match"
 * or "No accounts match" when a search found nothing, otherwise the tab's own empty words
 * ("No unpaid packages.", "No accounts are waiting for approval.").
 */
export function listAnnouncement(filter: StudentsFilter, count: number, noMatch: boolean): string {
  const waiting = filter === 'waiting'
  if (count > 0) return plural(count, waiting ? 'account' : 'package')
  if (noMatch) return waiting ? 'No accounts match' : 'No packages match'
  return filter === 'all' ? NO_STUDENTS_YET : EMPTY_TAB[filter]
}

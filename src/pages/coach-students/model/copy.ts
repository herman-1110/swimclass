import { plural } from '@/shared/lib/format'

import type { StudentsFilter } from './rows'

// The page's own words (coach-students §6, §7; coach-add-students §5.2.1; proposed).

/** After Add students (`?added=`): "3 students added", "Student added". */
export function studentsAdded(size: number): string {
  return size === 1 ? 'Student added' : `${size} students added`
}

/**
 * What a polite live region says after the tab or the search changes: "13 packages",
 * "No packages match"; on the Waiting tab "1 account", "No accounts match".
 */
export function listAnnouncement(filter: StudentsFilter, count: number): string {
  if (filter === 'waiting') return count === 0 ? 'No accounts match' : plural(count, 'account')
  return count === 0 ? 'No packages match' : plural(count, 'package')
}

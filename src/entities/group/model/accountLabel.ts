import { possessive } from '@/shared/lib/format'

import type { Group } from './types'

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('en') === b.trim().toLocaleLowerCase('en')
}

/**
 * Whose account a group books from, in the coach's words (coach-students §5.2.5,
 * `AdminStudents.dc.html`): "Own account" when the group is one student with the account
 * holder's own name (trimmed, any case: Wei Jie books for himself), otherwise
 * "Farah’s account". `accountName` is the account's display name.
 */
export function accountLabel(
  group: Pick<Group, 'size' | 'display_names'>,
  accountName: string,
): string {
  return group.size === 1 && sameName(group.display_names, accountName)
    ? 'Own account'
    : `${possessive(accountName.trim())} account`
}

/**
 * The line under a group's names on the coach's screens (the Students table and cards,
 * Add booking's group list): "Farah’s account · Sunrise Res.", "Own account · Palm Court".
 */
export function accountLine(
  group: Pick<Group, 'size' | 'display_names' | 'location'>,
  accountName: string,
): string {
  return `${accountLabel(group, accountName)} · ${group.location}`
}

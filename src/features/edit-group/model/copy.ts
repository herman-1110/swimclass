import { accountLabel, type Group } from '@/entities/group'
import { possessive } from '@/shared/lib/format'

import type { EditableGroup } from './types'

// Edit group's words (coach-add-students §2.7, §5.2.3, §7; proposed, like the flow itself).

export const EDIT_GROUP = 'Edit group'
export const SAVE_CHANGES = 'Save changes'
/** Under Pool location: update_group moves the upcoming lessons too (coach-students §5.3 W4). */
export const LOCATION_HELP = 'Upcoming lessons move to the new location.'
/** The History drawer's notice after Save changes (a sentence, so it ends with a full stop). */
export const CHANGES_SAVED = 'Changes saved.'

/** The dialog's subtitle: "Hana · Farah’s account", "Wei Jie · Own account". */
export function groupSubtitle(group: EditableGroup, accountName: string): string {
  return `${group.display_names} · ${accountLabel(group, accountName)}`
}

export const DEACTIVATE_GROUP = 'Deactivate group'
export const REACTIVATE_GROUP = 'Reactivate group'
/** The History drawer's notices after Deactivate and Reactivate. */
export const GROUP_DEACTIVATED = 'Group deactivated.'
export const GROUP_REACTIVATED = 'Group reactivated.'

/** The confirmation's title: "Deactivate Hana?". */
export function deactivateTitle(group: Pick<EditableGroup, 'display_names'>): string {
  return `Deactivate ${group.display_names}?`
}

/** What deactivating does, under the title. */
export const DEACTIVATE_DESCRIPTION =
  'They can’t book until you reactivate the group. Their packages and history stay.'

// Deleting a group added by mistake, from History's Group section (Herman, 9 Oct 2026).

/** The group as Delete names it: its students and type. */
type NamedGroup = Pick<Group, 'display_names' | 'type_label'>

export const DELETE_GROUP = 'Delete group'
export const KEEP_GROUP = 'Keep group'

/** The confirmation's title: "Delete Aiman & Sofia’s 1-to-2 group?". */
export function deleteGroupTitle(group: NamedGroup): string {
  return `Delete ${possessive(group.display_names)} ${group.type_label} group?`
}

/** What deleting does, under the title; the account named is the one that stays. */
export function deleteGroupDescription(accountName: string): string {
  return `It goes from Students & payments with its payments, lessons and starting balance. ${possessive(accountName)} account stays. Nobody is emailed. This can’t be undone.`
}

/** The Students page's notice once it has gone: "Aiman & Sofia’s 1-to-2 group deleted.". */
export function groupDeleted(group: NamedGroup): string {
  return `${possessive(group.display_names)} ${group.type_label} group deleted.`
}

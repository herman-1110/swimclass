import { accountLabel } from '@/entities/group'

import type { EditableGroup } from './types'

// Edit group's words (coach-add-students §2.7, §5.2.3, §7; proposed, like the flow itself).

export const EDIT_GROUP = 'Edit group'
export const SAVE_CHANGES = 'Save changes'
/** Under Pool location: update_group moves the upcoming lessons too (coach-students §5.3 W4). */
export const LOCATION_HELP = 'Upcoming lessons move to the new location.'
/** The History drawer's notice after Save changes. */
export const CHANGES_SAVED = 'Changes saved'

/** The dialog's subtitle: "Hana · Farah’s account", "Wei Jie · Own account". */
export function groupSubtitle(group: EditableGroup, accountName: string): string {
  return `${group.display_names} · ${accountLabel(group, accountName)}`
}

export const DEACTIVATE_GROUP = 'Deactivate group'
export const REACTIVATE_GROUP = 'Reactivate group'
export const GROUP_DEACTIVATED = 'Group deactivated'
export const GROUP_REACTIVATED = 'Group reactivated'

/** The confirmation's title: "Deactivate Hana?". */
export function deactivateTitle(group: Pick<EditableGroup, 'display_names'>): string {
  return `Deactivate ${group.display_names}?`
}

/** What deactivating does, under the title. */
export const DEACTIVATE_DESCRIPTION =
  'They can’t book until you reactivate the group. Their packages and history stay.'

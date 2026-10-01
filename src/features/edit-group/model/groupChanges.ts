import type { EditableGroup } from './types'

// Edit group's form (coach-add-students §2.7, §5.2.3): the pool location and the starting
// balance. Only what changed is sent; update_group keeps every value it gets null for.

/** The form as typed. */
export type GroupDraft = { location: string; usedText: string; paidText: string }

/** What update_group is asked to change; a left-out value stays as it is. */
export type UpdateGroupInput = {
  groupId: string
  location?: string
  openingUsed?: number
  openingPaid?: number
}

/** The part of the dialog a message belongs to; `form` is above the buttons. */
export type GroupField = 'location' | 'used' | 'paid' | 'form'

/** The form filled with the group's current values. */
export function groupDraft(group: EditableGroup): GroupDraft {
  return {
    location: group.location,
    usedText: String(group.opening_used_lessons),
    paidText: String(group.opening_paid_lessons),
  }
}

/**
 * A starting-balance count as typed: digits only, empty counts as 0 (as on Add students,
 * coach-add-students §5.3). The dialog's fields drop anything but digits as they're typed;
 * null for anything else ("-1", "2.5", or more digits than a number holds).
 */
export function countFrom(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  if (!/^\d+$/.test(trimmed)) return null
  const count = Number(trimmed)
  return Number.isSafeInteger(count) ? count : null
}

/**
 * The changes to send: only the values that differ from the group's (the location compared
 * trimmed), or `null` when nothing changed, so the dialog closes without a call. A count
 * that isn't a whole number of 0 or more gets invalid_opening's words before any call.
 */
export function groupChanges(
  group: EditableGroup,
  draft: GroupDraft,
):
  | { changes: UpdateGroupInput | null }
  | { check: { field: 'used' | 'paid'; code: 'invalid_opening' } } {
  const used = countFrom(draft.usedText)
  if (used === null) return { check: { field: 'used', code: 'invalid_opening' } }
  const paid = countFrom(draft.paidText)
  if (paid === null) return { check: { field: 'paid', code: 'invalid_opening' } }
  const location = draft.location.trim()
  const changes: UpdateGroupInput = { groupId: group.group_id }
  if (location !== group.location) changes.location = location
  if (used !== group.opening_used_lessons) changes.openingUsed = used
  if (paid !== group.opening_paid_lessons) changes.openingPaid = paid
  const changed = Object.keys(changes).length > 1
  return { changes: changed ? changes : null }
}

/** Where a refusal shows: invalid_location at the location, invalid_opening at the counts. */
export function groupErrorField(code: string): GroupField {
  if (code === 'invalid_location') return 'location'
  if (code === 'invalid_opening') return 'used'
  return 'form'
}

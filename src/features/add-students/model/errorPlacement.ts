import { toAppError } from '@/shared/api/rpc'

import type { FieldKey } from './types'

/** What is on screen when the answer comes back: a problem only goes to a field that shows. */
export type VisibleFields = {
  /** The number of student rows (the chosen lesson type). */
  size: number
  /** "First package already paid" is ticked: Amount and Paid by show. */
  paid: boolean
  /** The starting balance is open. */
  openingOpen: boolean
}

function rowIndex(detail: Readonly<Record<string, unknown>>, size: number): number | null {
  const index = detail.index
  return typeof index === 'number' && Number.isInteger(index) && index >= 1 && index <= size
    ? index
    : null
}

/**
 * Where a create_group refusal shows (the spec §5.4): at the field it is about, or above the
 * buttons for everything else (`not_found`, `not_customer`, `network`, `unknown` …). A code
 * whose message needs a detail it lacks shows above the buttons, where messages.ts gives the
 * generic words.
 */
export function groupErrorField(error: unknown, visible: VisibleFields): FieldKey {
  const { code, detail } = toAppError(error)
  switch (code) {
    case 'invalid_students':
    case 'invalid_name':
    case 'student_other_account': {
      const index = rowIndex(detail, visible.size)
      return index === null ? 'form' : `student-${index}`
    }
    case 'group_full':
      return 'type'
    case 'invalid_location':
      return 'location'
    case 'invalid_opening':
      return visible.openingOpen ? 'openingUsed' : 'form'
    case 'duplicate_group':
      return typeof detail.group_id === 'string' ? 'students' : 'form'
    case 'invalid_method':
      return visible.paid ? 'method' : 'form'
    case 'invalid_amount':
    case 'price_not_set':
      return visible.paid ? 'amount' : 'form'
    default:
      return 'form'
  }
}

/** Where an `admin-accounts` `create_account` refusal shows (the spec §5.2.2). */
export function accountErrorField(error: unknown): FieldKey {
  switch (toAppError(error).code) {
    case 'invalid_display_name':
      return 'newName'
    case 'invalid_username':
    case 'username_taken':
      return 'newUsername'
    case 'invalid_email':
    case 'email_taken':
      return 'newEmail'
    case 'invalid_phone':
      return 'newPhone'
    default:
      return 'form'
  }
}

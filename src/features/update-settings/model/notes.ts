import type { SettingsDraft, SettingsField } from './types'

// The notes under risky changes (coach-settings §6.5; prompt 10 TASK 6 gives the travel
// gap's words, the others are proposed). Each shows while its setting differs from the
// saved one, and goes away when it is changed back or saved.

/** Under the open hours table while any day differs from the saved hours. */
export const HOURS_NOTE =
  'Changing open hours affects times shown to customers straight away. Existing lessons stay booked.'

/** Under the package prices while any of the three differs. */
export const PRICES_NOTE =
  'Customers see new prices straight away. Payments already recorded keep their amounts.'

const CHANGE_NOTES: Partial<Record<SettingsField, string>> = {
  travel_gap_minutes:
    'Changing the travel gap affects times shown to customers straight away. Existing lessons stay booked.',
  lesson_lengths:
    'Changing lesson lengths affects what customers can book straight away, and what you can add with Add booking. Existing lessons stay booked.',
  max_students_per_lesson:
    'Applies to groups you add from now on. Existing groups keep their students.',
  start_step_minutes:
    'Changing start times affects times shown to customers straight away. Existing lessons stay booked.',
  cancel_cutoff_hours: 'Applies straight away, also to lessons already booked.',
  booking_window_weeks:
    'Changing the booking window affects how far ahead customers can book straight away. Existing lessons stay booked.',
  lessons_per_package: 'Package numbers and balances are recounted for every group straight away.',
  unpaid_packages_allowed: 'Applies straight away to how many lessons every group can still book.',
}

/** Approve new accounts turned off: the sign-up trigger reads the setting only at sign-up. */
export const APPROVAL_OFF_NOTE =
  'New sign-ups can book straight away. Accounts already waiting still need your approval.'

/**
 * No email, changed or not (production starts with ''): the late-change alert and the
 * schedule go to the coach's address only.
 */
export const NO_EMAIL_NOTE = 'With no email, your schedule and late-change alerts aren’t sent.'

/** The note under a setting's row, or null. `changed`: the settings that differ (checkForm). */
export function settingNote(
  field: SettingsField,
  draft: SettingsDraft,
  changed: readonly SettingsField[],
): string | null {
  if (field === 'coach_email') return draft.coach_email.trim() === '' ? NO_EMAIL_NOTE : null
  if (!changed.includes(field)) return null
  if (field === 'require_approval') return draft.require_approval ? null : APPROVAL_OFF_NOTE
  return CHANGE_NOTES[field] ?? null
}

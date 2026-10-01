import type { Weekday } from '@/entities/open-hours'
import type { CoachSettings } from '@/entities/settings'

import type {
  ChoiceField,
  CountField,
  PriceField,
  SettingsField,
  SwitchField,
  TimeField,
} from './types'

/** The settings form's id: the header's and the Save bar's "Save changes" submit it. */
export const SETTINGS_FORM_ID = 'settings-form'

/**
 * Each settings column's label on the form, for invalid_setting's `{field}` ("Travel gap
 * has a value that isn’t allowed…", coach-settings §5.2). Every column update_settings
 * takes except business_name, which the form doesn't show (§10 Q5). The prices are named
 * by type (proposed).
 */
export const FIELD_LABELS = {
  travel_gap_minutes: 'Travel gap',
  lesson_lengths: 'Lesson lengths',
  max_students_per_lesson: 'Students per lesson',
  start_step_minutes: 'Start times',
  cancel_cutoff_hours: 'Cancel or reschedule',
  booking_window_weeks: 'Booking window',
  require_approval: 'Approve new accounts',
  lessons_per_package: 'Lessons per package',
  price_1to1_cents: '1-to-1 price',
  price_1to2_cents: '1-to-2 price',
  price_1to3_cents: '1-to-3 price',
  unpaid_packages_allowed: 'Unpaid packages allowed',
  lesson_expiry_months: 'Unused lessons expire',
  payment_instructions: 'Payment instructions',
  reminder_time: 'Lesson reminder to customers',
  digest_time: 'Tomorrow’s schedule for you',
  late_change_alert: 'Late-change alert',
  booking_confirmations: 'Booking confirmations',
  coach_email: 'Your email',
} as const satisfies Record<
  Exclude<keyof CoachSettings, 'id' | 'updated_at' | 'business_name'>,
  string
>

/**
 * Each setting's control, with the drawing's ids (design/AdminSettings.dc.html). Lesson
 * lengths has two boxes: an error there focuses "1 hour".
 */
export const FIELD_IDS: Readonly<Record<SettingsField, string>> = {
  travel_gap_minutes: 'set-gap',
  lesson_lengths: 'set-length-60',
  max_students_per_lesson: 'set-group',
  start_step_minutes: 'set-step',
  cancel_cutoff_hours: 'set-cancel',
  booking_window_weeks: 'set-window',
  require_approval: 'set-approve',
  lessons_per_package: 'set-size',
  price_1to1_cents: 'set-price-1',
  price_1to2_cents: 'set-price-2',
  price_1to3_cents: 'set-price-3',
  unpaid_packages_allowed: 'set-credit',
  payment_instructions: 'set-howpay',
  reminder_time: 'set-remind',
  digest_time: 'set-digest',
  late_change_alert: 'set-late',
  booking_confirmations: 'set-confirm',
  coach_email: 'set-email',
}

/** The settings in the order the form shows them: the first one in trouble gets focus. */
export const FIELD_ORDER: readonly SettingsField[] = [
  'travel_gap_minutes',
  'lesson_lengths',
  'max_students_per_lesson',
  'start_step_minutes',
  'cancel_cutoff_hours',
  'booking_window_weeks',
  'require_approval',
  'lessons_per_package',
  'price_1to1_cents',
  'price_1to2_cents',
  'price_1to3_cents',
  'unpaid_packages_allowed',
  'payment_instructions',
  'reminder_time',
  'digest_time',
  'late_change_alert',
  'booking_confirmations',
  'coach_email',
]

export const COUNT_FIELDS: readonly CountField[] = [
  'travel_gap_minutes',
  'cancel_cutoff_hours',
  'booking_window_weeks',
  'lessons_per_package',
  'unpaid_packages_allowed',
]

export const CHOICE_FIELDS: readonly ChoiceField[] = [
  'max_students_per_lesson',
  'start_step_minutes',
]

export const PRICE_FIELDS: readonly PriceField[] = [
  'price_1to1_cents',
  'price_1to2_cents',
  'price_1to3_cents',
]

export const TIME_FIELDS: readonly TimeField[] = ['reminder_time', 'digest_time']

export const SWITCH_FIELDS: readonly SwitchField[] = [
  'require_approval',
  'late_change_alert',
  'booking_confirmations',
]

/** A setting the form edits (not business_name, lesson_expiry_months or another column). */
export function isSettingsField(column: string): column is SettingsField {
  return Object.hasOwn(FIELD_IDS, column)
}

/** The open hours table's "Edit" button for a day: a refused day gets focus there. */
export function editHoursId(weekday: Weekday): string {
  return `edit-hours-${weekday}`
}

/** The words under a day's chips when the database refused its hours. */
export function hoursErrorId(weekday: Weekday): string {
  return `hours-${weekday}-error`
}

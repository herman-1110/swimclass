import { describe, expect, it } from 'vitest'

import { FIELD_IDS, FIELD_LABELS, FIELD_ORDER, isSettingsField } from './fields'

// update_settings' settable columns (…100400_settings.sql, v_types; data-contracts §3.10).
const SETTABLE = [
  'business_name',
  'coach_email',
  'travel_gap_minutes',
  'start_step_minutes',
  'lesson_lengths',
  'max_students_per_lesson',
  'cancel_cutoff_hours',
  'booking_window_weeks',
  'lessons_per_package',
  'unpaid_packages_allowed',
  'price_1to1_cents',
  'price_1to2_cents',
  'price_1to3_cents',
  'payment_instructions',
  'lesson_expiry_months',
  'reminder_time',
  'digest_time',
  'booking_confirmations',
  'late_change_alert',
  'require_approval',
]

describe('the settings fields', () => {
  it('label every settable column but the business name, for invalid_setting', () => {
    expect(Object.keys(FIELD_LABELS).sort()).toEqual(
      SETTABLE.filter((column) => column !== 'business_name').sort(),
    )
  })

  it('give every setting the form edits one control, in form order', () => {
    expect([...FIELD_ORDER].sort()).toEqual(Object.keys(FIELD_IDS).sort())
    expect(new Set(Object.values(FIELD_IDS)).size).toBe(FIELD_ORDER.length)
    expect(FIELD_IDS.travel_gap_minutes).toBe('set-gap')
    expect(FIELD_IDS.coach_email).toBe('set-email')
  })

  it('know which columns the form edits', () => {
    expect(isSettingsField('travel_gap_minutes')).toBe(true)
    expect(isSettingsField('lesson_expiry_months')).toBe(false)
    expect(isSettingsField('business_name')).toBe(false)
    expect(isSettingsField('toString')).toBe(false)
  })
})

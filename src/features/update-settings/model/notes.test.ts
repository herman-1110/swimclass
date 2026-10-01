import { describe, expect, it } from 'vitest'

import { APPROVAL_OFF_NOTE, NO_EMAIL_NOTE, settingNote } from './notes'
import type { SettingsDraft, SettingsField } from './types'

const DRAFT: SettingsDraft = {
  travel_gap_minutes: '60',
  lesson_lengths: [60, 120],
  max_students_per_lesson: '3',
  start_step_minutes: '30',
  cancel_cutoff_hours: '6',
  booking_window_weeks: '4',
  require_approval: true,
  lessons_per_package: '4',
  price_1to1_cents: '',
  price_1to2_cents: '',
  price_1to3_cents: '',
  unpaid_packages_allowed: '1',
  payment_instructions: '',
  reminder_time: '8:00 pm',
  digest_time: '8:00 pm',
  late_change_alert: true,
  booking_confirmations: true,
  coach_email: 'herman@example.com',
}

describe('settingNote', () => {
  it('says what a risky change does while it differs (prompt 10’s travel gap words)', () => {
    expect(settingNote('travel_gap_minutes', DRAFT, ['travel_gap_minutes'])).toBe(
      'Changing the travel gap affects times shown to customers straight away. Existing lessons stay booked.',
    )
    expect(settingNote('travel_gap_minutes', DRAFT, [])).toBeNull()
  })

  it.each<[SettingsField, string]>([
    ['lesson_lengths', 'and what you can add with Add booking'],
    ['max_students_per_lesson', 'Applies to groups you add from now on.'],
    ['start_step_minutes', 'Changing start times'],
    ['cancel_cutoff_hours', 'also to lessons already booked'],
    ['booking_window_weeks', 'how far ahead customers can book'],
    ['lessons_per_package', 'recounted for every group straight away'],
    ['unpaid_packages_allowed', 'how many lessons every group can still book'],
  ])('has a note for %s', (field, words) => {
    expect(settingNote(field, DRAFT, [field])).toContain(words)
  })

  it('has none for the safe settings', () => {
    for (const field of ['reminder_time', 'late_change_alert', 'payment_instructions'] as const) {
      expect(settingNote(field, DRAFT, [field])).toBeNull()
    }
  })

  it('warns only when Approve new accounts is turned off', () => {
    const off = { ...DRAFT, require_approval: false }
    expect(settingNote('require_approval', off, ['require_approval'])).toBe(APPROVAL_OFF_NOTE)
    expect(settingNote('require_approval', DRAFT, ['require_approval'])).toBeNull()
  })

  it('warns about an empty email, changed or not', () => {
    expect(settingNote('coach_email', { ...DRAFT, coach_email: '  ' }, [])).toBe(NO_EMAIL_NOTE)
    expect(NO_EMAIL_NOTE).toBe('With no email, your schedule and late-change alerts aren’t sent.')
    expect(settingNote('coach_email', DRAFT, ['coach_email'])).toBeNull()
  })
})

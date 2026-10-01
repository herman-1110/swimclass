import { describe, expect, it } from 'vitest'

import { AppError } from '@/shared/api/rpc'

import { accountErrorField, groupErrorField } from './errorPlacement'

const shown = { size: 3, paid: true, openingOpen: true }

describe('groupErrorField', () => {
  it('puts a student’s problem on that student’s row', () => {
    expect(groupErrorField(new AppError('invalid_name', { index: 2 }), shown)).toBe('student-2')
    expect(groupErrorField(new AppError('invalid_students', { index: 3 }), shown)).toBe('student-3')
    expect(groupErrorField(new AppError('student_other_account', { index: 1 }), shown)).toBe(
      'student-1',
    )
  })

  it('puts a student’s problem above the buttons when its row isn’t there', () => {
    expect(groupErrorField(new AppError('invalid_students'), shown)).toBe('form')
    expect(groupErrorField(new AppError('invalid_name', { index: 3 }), { ...shown, size: 2 })).toBe(
      'form',
    )
  })

  it('places the other refusals at their fields (the spec §5.4)', () => {
    expect(groupErrorField(new AppError('group_full', { max: 2 }), shown)).toBe('type')
    expect(groupErrorField(new AppError('invalid_location'), shown)).toBe('location')
    expect(groupErrorField(new AppError('invalid_opening'), shown)).toBe('openingUsed')
    expect(groupErrorField(new AppError('duplicate_group', { group_id: 'c0' }), shown)).toBe(
      'students',
    )
    expect(groupErrorField(new AppError('invalid_method'), shown)).toBe('method')
    expect(groupErrorField(new AppError('invalid_amount'), shown)).toBe('amount')
    expect(groupErrorField(new AppError('price_not_set'), shown)).toBe('amount')
  })

  it('keeps a problem visible when its field is closed', () => {
    const closed = { size: 1, paid: false, openingOpen: false }
    expect(groupErrorField(new AppError('invalid_opening'), closed)).toBe('form')
    expect(groupErrorField(new AppError('price_not_set'), closed)).toBe('form')
    expect(groupErrorField(new AppError('invalid_method'), closed)).toBe('form')
  })

  it('shows everything else above the buttons', () => {
    for (const code of ['not_found', 'not_customer', 'not_coach', 'network', 'unknown']) {
      expect(groupErrorField(new AppError(code), shown)).toBe('form')
    }
    expect(groupErrorField(new AppError('duplicate_group'), shown)).toBe('form')
    expect(groupErrorField(new TypeError('Failed to fetch'), shown)).toBe('form')
  })
})

describe('accountErrorField', () => {
  it('puts each create_account refusal on its field (the spec §5.2.2)', () => {
    expect(accountErrorField(new AppError('invalid_display_name'))).toBe('newName')
    expect(accountErrorField(new AppError('invalid_username'))).toBe('newUsername')
    expect(accountErrorField(new AppError('username_taken'))).toBe('newUsername')
    expect(accountErrorField(new AppError('invalid_email'))).toBe('newEmail')
    expect(accountErrorField(new AppError('email_taken'))).toBe('newEmail')
    expect(accountErrorField(new AppError('invalid_phone'))).toBe('newPhone')
    expect(accountErrorField(new AppError('not_coach'))).toBe('form')
    expect(accountErrorField(new AppError('unknown'))).toBe('form')
  })
})

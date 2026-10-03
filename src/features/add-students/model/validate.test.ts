import { describe, expect, it } from 'vitest'

import { messageFor } from '@/shared/config/messages'

import { type KnownStudent, resolveStudents } from './students'
import { NEW_ACCOUNT } from './types'
import { type FormSnapshot, validate } from './validate'

const hana: KnownStudent = { id: 'b0000000-0000-4000-8000-000000000003', name: 'Hana' }
const FARAH = 'a0000000-0000-4000-8000-000000000003'

function form(overrides: Partial<FormSnapshot> = {}): FormSnapshot {
  return {
    account: FARAH,
    newAccount: { name: '', username: '', email: '', phone: '' },
    usernameState: 'empty',
    rows: resolveStudents(['Hana', 'Hadi'], [hana]),
    location: 'Sunrise Res.',
    paid: false,
    amount: '',
    priceCents: null,
    method: 'cash',
    ...overrides,
  }
}

const coach = { audience: 'coach' } as const

describe('validate', () => {
  it('passes a complete form', () => {
    expect(validate(form())).toEqual({})
  })

  it('asks for an account first', () => {
    const problems = validate(form({ account: '' }))
    expect(messageFor(problems.account, coach)).toBe('Choose an account, or create a new one.')
  })

  it('checks every row: a name of 1 to 100 characters, and no existing student twice', () => {
    const long = 'x'.repeat(101)
    const problems = validate(form({ rows: resolveStudents(['  ', long, 'hana', 'Hana'], [hana]) }))
    expect(messageFor(problems['student-1'], coach)).toBe(
      'Type a name for student 1 (up to 100 characters).',
    )
    expect(messageFor(problems['student-2'], coach)).toBe(
      'Type a name for student 2 (up to 100 characters).',
    )
    expect(problems['student-3']).toBeUndefined()
    expect(messageFor(problems['student-4'], coach)).toBe(
      'Student 4 is already in the list or can’t be found. Pick another student or type a new name.',
    )
  })

  it('counts characters as the database does, so 100 emoji are fine', () => {
    expect(validate(form({ rows: resolveStudents(['🌊'.repeat(100)], []) }))).toEqual({})
  })

  it('allows two new students with the same name (the spec Q9)', () => {
    expect(validate(form({ rows: resolveStudents(['Adam', 'adam'], []) }))).toEqual({})
  })

  it('asks for the pool location', () => {
    const problems = validate(form({ location: '   ' }))
    expect(messageFor(problems.location, coach)).toBe(
      'Type the pool location (up to 100 characters).',
    )
    expect(validate(form({ location: 'x'.repeat(101) })).location).toBeDefined()
  })

  it('checks the amount and the method only when the first package is paid', () => {
    expect(validate(form({ amount: 'abc', method: '' }))).toEqual({})
    const problems = validate(form({ paid: true, amount: 'abc', method: '' }))
    expect(messageFor(problems.amount, coach)).toBe('Enter the amount in RM, like 240 or 240.50.')
    expect(messageFor(problems.method, coach)).toBe('Choose how they paid: Cash, Transfer or FPX.')
  })

  it('needs an amount while the type has no price (the spec §8, scenario 7)', () => {
    const problems = validate(form({ paid: true, amount: '' }))
    expect(messageFor(problems.amount, coach)).toBe(
      'No price is set for this lesson type. Type the amount, or set the price in Settings.',
    )
    expect(validate(form({ paid: true, amount: '', priceCents: 24000 }))).toEqual({})
    expect(validate(form({ paid: true, amount: '0' }))).toEqual({})
  })

  describe('a new account', () => {
    const siti = {
      name: 'Siti Rahman',
      username: 'Siti.Rahman',
      email: 'siti@example.com',
      phone: '012-345 6789',
    }

    it('passes with a name, a free username and an email; the phone is optional', () => {
      expect(
        validate(form({ account: NEW_ACCOUNT, newAccount: siti, usernameState: 'available' })),
      ).toEqual({})
      expect(
        validate(
          form({
            account: NEW_ACCOUNT,
            newAccount: { ...siti, phone: '' },
            usernameState: 'available',
          }),
        ),
      ).toEqual({})
    })

    it('checks each field with the words of the Edge Function’s codes', () => {
      const problems = validate(
        form({
          account: NEW_ACCOUNT,
          newAccount: { name: ' ', username: 'ab', email: 'siti@', phone: '0'.repeat(31) },
          usernameState: 'invalid',
        }),
      )
      expect(messageFor(problems.newName, coach)).toBe('Type their name (up to 100 characters).')
      expect(messageFor(problems.newUsername, coach)).toBe(
        'Use 3 to 30 small letters, numbers, dots or underscores.',
      )
      expect(messageFor(problems.newEmail, coach)).toBe(
        'Enter an email address like name@example.com.',
      )
      expect(messageFor(problems.newPhone, coach)).toBe(
        'Shorten the phone number to 30 characters or fewer.',
      )
    })

    it('says a taken username is taken', () => {
      const problems = validate(
        form({
          account: NEW_ACCOUNT,
          newAccount: { ...siti, username: 'zulaikha' },
          usernameState: 'taken',
        }),
      )
      expect(messageFor(problems.newUsername, coach)).toBe('That username is taken.')
    })

    it('leaves the new account fields alone for an existing account', () => {
      expect(
        validate(form({ newAccount: { name: '', username: '', email: '', phone: '' } })),
      ).toEqual({})
    })
  })
})

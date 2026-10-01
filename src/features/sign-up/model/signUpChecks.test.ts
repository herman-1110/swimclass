import { describe, expect, it } from 'vitest'

import {
  EMPTY_SIGN_UP,
  isEmailAddress,
  SIGN_UP_FIELDS,
  signUpFieldFor,
  signUpInput,
  signUpProblems,
  type SignUpValues,
} from './signUpChecks'

const newbie: SignUpValues = {
  username: 'newbie',
  name: 'New Person',
  email: 'newbie@example.com',
  phone: '012-111 2222',
  password: 'swim-new-2026',
  confirm: 'swim-new-2026',
}

describe('signUpProblems', () => {
  it('has nothing to say about a complete sign-up, with or without a phone', () => {
    expect(signUpProblems(newbie, 'available')).toEqual({})
    expect(signUpProblems({ ...newbie, phone: '' }, 'checking')).toEqual({})
  })

  it('names every problem of an empty form', () => {
    expect(signUpProblems(EMPTY_SIGN_UP, 'empty')).toEqual({
      username: 'invalid_username',
      name: 'name_required',
      email: 'email_address_invalid',
      password: 'weak_password',
    })
  })

  it('checks the username’s format before whether it is free', () => {
    expect(signUpProblems({ ...newbie, username: 'ab' }, 'invalid').username).toBe(
      'invalid_username',
    )
    expect(signUpProblems({ ...newbie, username: 'a b!' }).username).toBe('invalid_username')
    expect(signUpProblems({ ...newbie, username: 'meiling' }, 'taken').username).toBe(
      'username_taken',
    )
    // Still checking, or the check failed: the submit asks again.
    expect(signUpProblems(newbie, 'unknown').username).toBeUndefined()
  })

  it('wants a name, not just spaces', () => {
    expect(signUpProblems({ ...newbie, name: '   ' }).name).toBe('name_required')
  })

  it('wants something shaped like an email address', () => {
    for (const email of ['newbie', 'newbie@', 'newbie@example', 'new bie@example.com', '']) {
      expect(signUpProblems({ ...newbie, email }).email).toBe('email_address_invalid')
    }
    expect(signUpProblems({ ...newbie, email: '  newbie@example.com ' }).email).toBeUndefined()
  })

  it('wants at least 8 characters, typed the same twice', () => {
    expect(signUpProblems({ ...newbie, password: 'swim-26', confirm: 'swim-26' })).toEqual({
      password: 'weak_password',
    })
    expect(signUpProblems({ ...newbie, password: 'swim-2026' }).password).toBeUndefined()
    expect(signUpProblems({ ...newbie, confirm: 'swim-new-2025' })).toEqual({
      confirm: 'password_mismatch',
    })
  })
})

describe('signUpInput', () => {
  it('sends the username as stored, the name and email trimmed and a blank phone as null', () => {
    expect(
      signUpInput({
        ...newbie,
        username: ' New Bie ',
        name: '  New Person ',
        email: ' newbie@example.com ',
        phone: '  ',
        password: ' spaces kept ',
      }),
    ).toEqual({
      username: 'newbie',
      displayName: 'New Person',
      email: 'newbie@example.com',
      phone: null,
      password: ' spaces kept ',
    })
    expect(signUpInput(newbie).phone).toBe('012-111 2222')
  })
})

describe('signUpFieldFor', () => {
  it('puts each refusal under its field, and the rest above the button', () => {
    expect(signUpFieldFor('username_taken')).toBe('username')
    expect(signUpFieldFor('user_already_exists')).toBe('email')
    expect(signUpFieldFor('email_address_invalid')).toBe('email')
    expect(signUpFieldFor('weak_password')).toBe('password')
    expect(signUpFieldFor('over_email_send_rate_limit')).toBeNull()
    expect(signUpFieldFor('network')).toBeNull()
    expect(signUpFieldFor('signup_failed')).toBeNull()
  })
})

describe('isEmailAddress', () => {
  it('accepts name@example.com and refuses what is clearly not an address', () => {
    expect(isEmailAddress('name@example.com')).toBe(true)
    expect(isEmailAddress('mei.ling+swim@mail.example.my')).toBe(true)
    expect(isEmailAddress('name@example')).toBe(false)
    expect(isEmailAddress('name example.com')).toBe(false)
  })
})

describe('SIGN_UP_FIELDS', () => {
  it('lists the fields in the form’s order', () => {
    expect(SIGN_UP_FIELDS).toEqual(['username', 'name', 'email', 'phone', 'password', 'confirm'])
  })
})

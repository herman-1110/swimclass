import { describe, expect, it } from 'vitest'

import { isPasswordRefusal, passwordProblems } from './passwordChecks'

describe('passwordProblems', () => {
  it('wants at least 8 characters, typed the same twice', () => {
    expect(passwordProblems('swim-new-2026', 'swim-new-2026')).toEqual({})
    expect(passwordProblems('12345', '12345')).toEqual({ password: 'weak_password' })
    expect(passwordProblems('swim-new-2026', 'swim-new-2025')).toEqual({
      confirm: 'password_mismatch',
    })
    expect(passwordProblems('', 'x')).toEqual({
      password: 'weak_password',
      confirm: 'password_mismatch',
    })
  })
})

describe('isPasswordRefusal', () => {
  it('puts a weak or unchanged password under New password, the rest above the button', () => {
    expect(isPasswordRefusal('weak_password')).toBe(true)
    expect(isPasswordRefusal('same_password')).toBe(true)
    expect(isPasswordRefusal('not_signed_in')).toBe(false)
    expect(isPasswordRefusal('network')).toBe(false)
  })
})

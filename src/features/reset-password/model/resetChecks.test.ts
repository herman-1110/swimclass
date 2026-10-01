import { describe, expect, it } from 'vitest'

import { emailProblem, isNewPasswordRefusal, newPasswordProblems } from './resetChecks'

describe('emailProblem', () => {
  it('accepts an address, with spaces around it', () => {
    expect(emailProblem('meiling@example.com')).toBeNull()
    expect(emailProblem('  meiling@example.com ')).toBeNull()
  })

  it('refuses an empty or malformed address', () => {
    for (const email of ['', '   ', 'meiling', 'meiling@', 'meiling@example', 'mei ling@x.com']) {
      expect(emailProblem(email)).toBe('email_address_invalid')
    }
  })
})

describe('newPasswordProblems', () => {
  it('wants at least 8 characters', () => {
    expect(newPasswordProblems('swim-26', 'swim-26')).toEqual({ password: 'weak_password' })
    expect(newPasswordProblems('', '')).toEqual({ password: 'weak_password' })
    expect(newPasswordProblems('swim-2026', 'swim-2026')).toEqual({})
  })

  it('wants the same password twice', () => {
    expect(newPasswordProblems('swim-new-2026', 'swim-new-2025')).toEqual({
      confirm: 'password_mismatch',
    })
    expect(newPasswordProblems('short', '')).toEqual({
      password: 'weak_password',
      confirm: 'password_mismatch',
    })
  })
})

describe('isNewPasswordRefusal', () => {
  it('puts a weak or unchanged password under New password', () => {
    expect(isNewPasswordRefusal('weak_password')).toBe(true)
    expect(isNewPasswordRefusal('same_password')).toBe(true)
    expect(isNewPasswordRefusal('network')).toBe(false)
    expect(isNewPasswordRefusal('not_signed_in')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { isValidUsername, normalizeUsername, USERNAME_PATTERN } from './username'

describe('normalizeUsername', () => {
  it('lowercases and removes every space, as the person types', () => {
    expect(normalizeUsername('  MeiLing ')).toBe('meiling')
    expect(normalizeUsername('Mei Ling')).toBe('meiling')
    expect(normalizeUsername('siti.\tRahman_1')).toBe('siti.rahman_1')
    expect(normalizeUsername('')).toBe('')
    expect(normalizeUsername('   ')).toBe('')
  })
})

describe('isValidUsername', () => {
  it('accepts 3 to 30 small letters, numbers, dots or underscores', () => {
    expect(isValidUsername('newbie')).toBe(true)
    expect(isValidUsername('a.b_c9')).toBe(true)
    expect(isValidUsername('abc')).toBe(true)
    expect(isValidUsername('a'.repeat(30))).toBe(true)
  })

  it('refuses anything the database would refuse', () => {
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('a'.repeat(31))).toBe(false)
    expect(isValidUsername('ab!c')).toBe(false)
    expect(isValidUsername('Newbie')).toBe(false)
    expect(isValidUsername('has space')).toBe(false)
    expect(isValidUsername('')).toBe(false)
  })

  it('uses the same pattern the forms can show', () => {
    expect(USERNAME_PATTERN.source).toBe('^[a-z0-9._]{3,30}$')
  })
})

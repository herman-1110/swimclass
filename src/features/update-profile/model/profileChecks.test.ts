import { describe, expect, it } from 'vitest'

import { profileChanged, profileProblems, profileUpdate, profileValues } from './profileChecks'

const meiling = { display_name: 'Mei Ling', phone: '012-000 0002' }

describe('profileValues', () => {
  it('starts from the saved name and phone, showing no phone as empty', () => {
    expect(profileValues(meiling)).toEqual({ name: 'Mei Ling', phone: '012-000 0002' })
    expect(profileValues({ display_name: 'Herman', phone: null })).toEqual({
      name: 'Herman',
      phone: '',
    })
  })
})

describe('profileChanged', () => {
  it('is false until the name or phone really changes', () => {
    expect(profileChanged(meiling, profileValues(meiling))).toBe(false)
    expect(profileChanged(meiling, { name: ' Mei Ling ', phone: '012-000 0002 ' })).toBe(false)
    expect(profileChanged(meiling, { name: 'Mei Ling Tan', phone: '012-000 0002' })).toBe(true)
    expect(profileChanged(meiling, { name: 'Mei Ling', phone: '' })).toBe(true)
    expect(
      profileChanged({ display_name: 'Herman', phone: null }, { name: 'Herman', phone: '' }),
    ).toBe(false)
  })
})

describe('profileProblems', () => {
  it('wants a name, but not a phone', () => {
    expect(profileProblems({ name: '   ', phone: '012' })).toEqual({ name: 'name_required' })
    expect(profileProblems({ name: 'Mei Ling', phone: '' })).toEqual({})
  })
})

describe('profileUpdate', () => {
  it('trims both, and saves a blank phone as none', () => {
    expect(profileUpdate({ name: '  Mei Ling Tan ', phone: ' 012-345 6789 ' })).toEqual({
      displayName: 'Mei Ling Tan',
      phone: '012-345 6789',
    })
    expect(profileUpdate({ name: 'Mei Ling', phone: '   ' })).toEqual({
      displayName: 'Mei Ling',
      phone: null,
    })
  })
})

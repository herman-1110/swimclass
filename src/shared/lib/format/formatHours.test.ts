import { describe, expect, it } from 'vitest'

import { formatHours } from './formatHours'

describe('formatHours', () => {
  it('writes the hours with the right noun', () => {
    expect(formatHours(1)).toBe('1 hour')
    expect(formatHours(6)).toBe('6 hours')
    expect(formatHours(0)).toBe('0 hours')
  })

  it('refuses values that are not a whole number of hours', () => {
    expect(() => formatHours(-1)).toThrow(RangeError)
    expect(() => formatHours(1.5)).toThrow(RangeError)
  })
})

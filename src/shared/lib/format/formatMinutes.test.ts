import { describe, expect, it } from 'vitest'

import { formatMinutes } from './formatMinutes'

describe('formatMinutes', () => {
  it('writes whole hours in hours', () => {
    expect(formatMinutes(60)).toBe('1 hour')
    expect(formatMinutes(120)).toBe('2 hours')
    expect(formatMinutes(180)).toBe('3 hours')
  })

  it('writes anything else in minutes', () => {
    expect(formatMinutes(90)).toBe('90 minutes')
    expect(formatMinutes(45)).toBe('45 minutes')
    expect(formatMinutes(150)).toBe('150 minutes')
    expect(formatMinutes(1)).toBe('1 minute')
    expect(formatMinutes(0)).toBe('0 minutes')
  })

  it('refuses values that are not a whole number of minutes', () => {
    expect(() => formatMinutes(-30)).toThrow(RangeError)
    expect(() => formatMinutes(7.5)).toThrow(RangeError)
    expect(() => formatMinutes(Number.NaN)).toThrow(RangeError)
  })
})

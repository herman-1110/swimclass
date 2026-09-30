import { describe, expect, it } from 'vitest'

import { formatRinggit } from './formatRinggit'

describe('formatRinggit', () => {
  it('writes whole ringgit without decimals', () => {
    expect(formatRinggit(24000)).toBe('RM 240')
    expect(formatRinggit(40000)).toBe('RM 400')
    expect(formatRinggit(0)).toBe('RM 0')
  })

  it('writes any other amount with two decimals', () => {
    expect(formatRinggit(24050)).toBe('RM 240.50')
    expect(formatRinggit(24005)).toBe('RM 240.05')
    expect(formatRinggit(5)).toBe('RM 0.05')
    expect(formatRinggit(99)).toBe('RM 0.99')
  })

  it('groups thousands with commas', () => {
    expect(formatRinggit(120000)).toBe('RM 1,200')
    expect(formatRinggit(123456789)).toBe('RM 1,234,567.89')
  })

  it('puts a minus sign in front of a negative amount', () => {
    expect(formatRinggit(-500)).toBe('-RM 5')
    expect(formatRinggit(-24050)).toBe('-RM 240.50')
  })

  it('leaves out "RM " for an amount field', () => {
    expect(formatRinggit(26000, { symbol: false })).toBe('260')
    expect(formatRinggit(26050, { symbol: false })).toBe('260.50')
    expect(formatRinggit(120050, { symbol: false })).toBe('1,200.50')
  })

  it('refuses anything that is not a whole number of cents', () => {
    expect(() => formatRinggit(240.5)).toThrow(RangeError)
    expect(() => formatRinggit(Number.NaN)).toThrow(RangeError)
    expect(() => formatRinggit(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

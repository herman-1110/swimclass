import { describe, expect, it } from 'vitest'

import { formatPaidOn, formatPaidOnFull } from './dates'

describe('formatPaidOn', () => {
  it('reads the date column as that day, whatever the device’s time zone', () => {
    expect(formatPaidOn('2026-09-19')).toBe('19 Sep')
    expect(formatPaidOn('2026-08-01')).toBe('1 Aug')
  })

  it('adds the year only for another year than now', () => {
    expect(formatPaidOn('2026-08-22', '2026-09-26T12:00:00+08:00')).toBe('22 Aug')
    expect(formatPaidOn('2025-12-12', '2026-01-05T12:00:00+08:00')).toBe('12 Dec 2025')
  })
})

describe('formatPaidOnFull', () => {
  it('always gives the year', () => {
    expect(formatPaidOnFull('2026-08-29')).toBe('29 Aug 2026')
  })
})

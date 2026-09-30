import { describe, expect, it } from 'vitest'

import { addDays, weekDays } from './dateKeys'

// The tests run in America/Los_Angeles (vite.config.ts), so any use of the device's own
// time zone would move these dates.

describe('addDays', () => {
  it('moves by whole MYT days, across months and years', () => {
    expect(addDays('2026-09-28', 7)).toBe('2026-10-05')
    expect(addDays('2026-10-04', -6)).toBe('2026-09-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-09-26', 0)).toBe('2026-09-26')
  })

  it('is not moved by the device’s daylight saving change', () => {
    // Los Angeles changes its clocks on Sun 1 Nov 2026; Malaysia never does.
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
  })

  it('refuses a date that isn’t one', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
  })
})

describe('weekDays', () => {
  it('lists the seven dates of a week, Monday first', () => {
    expect(weekDays('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
  })
})

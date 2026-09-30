import { describe, expect, it } from 'vitest'

import { addDays, atMinute, minutesIntoDay, weekDays } from './days'

// The tests run in America/Los_Angeles (vite.config.ts), so any use of the device's zone fails.

describe('addDays', () => {
  it('moves across months and years in MYT', () => {
    expect(addDays('2026-09-28', 6)).toBe('2026-10-04')
    expect(addDays('2026-10-03', 7)).toBe('2026-10-10')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })

  it('goes back with a negative number', () => {
    expect(addDays('2026-10-03', -7)).toBe('2026-09-26')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('weekDays', () => {
  it('lists the 7 dates from the Monday', () => {
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

describe('minutesIntoDay', () => {
  it('counts from the day’s MYT midnight', () => {
    expect(minutesIntoDay('2026-10-03', '2026-10-03T19:30:00+08:00')).toBe(1170)
    expect(minutesIntoDay('2026-10-03', '2026-10-03T07:00:00+08:00')).toBe(420)
  })

  it('reads UTC text the same way', () => {
    expect(minutesIntoDay('2026-10-03', '2026-10-02T23:00:00+00:00')).toBe(420)
  })

  it('gives 1440 for the next midnight and less than 0 before the day', () => {
    expect(minutesIntoDay('2026-10-03', '2026-10-04T00:00:00+08:00')).toBe(1440)
    expect(minutesIntoDay('2026-10-03', '2026-10-02T23:00:00+08:00')).toBe(-60)
  })
})

describe('atMinute', () => {
  it('is the moment that many minutes into the MYT day', () => {
    expect(atMinute('2026-10-03', 1170).toISOString()).toBe('2026-10-03T11:30:00.000Z')
    expect(atMinute('2026-10-03', 1440).toISOString()).toBe('2026-10-03T16:00:00.000Z')
  })
})

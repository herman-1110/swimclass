import { describe, expect, it } from 'vitest'

import { atMinute, minutesIntoDay } from './days'

// The tests run in America/Los_Angeles (vite.config.ts), so any use of the device's zone fails.

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

import { describe, expect, it } from 'vitest'

import { startTimeKey } from './startTimeKey'

// week_slots sends UTC text; the key is the MYT clock. The tests run in America/Los_Angeles.
describe('startTimeKey', () => {
  it('writes the MYT start time on the 24-hour clock', () => {
    expect(startTimeKey({ starts_at: '2026-09-29T11:30:00+00:00' })).toBe('19:30')
    expect(startTimeKey({ starts_at: '2026-10-02T23:00:00+00:00' })).toBe('07:00')
    expect(startTimeKey({ starts_at: '2026-10-03T04:00:00+00:00' })).toBe('12:00')
  })

  it('reads a start written with any offset the same way', () => {
    expect(startTimeKey({ starts_at: '2026-09-29T19:30:00+08:00' })).toBe('19:30')
    expect(startTimeKey({ starts_at: '2026-09-29T11:30:00.000Z' })).toBe('19:30')
  })
})

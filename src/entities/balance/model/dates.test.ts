import { describe, expect, it } from 'vitest'

import { formatDayMonth } from './dates'

describe('formatDayMonth', () => {
  it('writes a moment as its day in Malaysia time', () => {
    expect(formatDayMonth('2026-10-04T09:00:00+00:00')).toBe('4 Oct')
    // 11:30 pm UTC on 30 Sep is already 1 Oct in Malaysia.
    expect(formatDayMonth('2026-09-30T23:30:00+00:00')).toBe('1 Oct')
  })

  it('adds the year only for a day in another year than now', () => {
    const now = '2026-09-26T12:00:00+08:00'
    expect(formatDayMonth('2026-09-18T11:30:00+00:00', now)).toBe('18 Sep')
    expect(formatDayMonth('2025-12-18T11:30:00+00:00', now)).toBe('18 Dec 2025')
  })
})

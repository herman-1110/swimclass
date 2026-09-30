import { describe, expect, it } from 'vitest'

import { formatDayMonth } from './dates'

describe('formatDayMonth', () => {
  it('writes a moment as its day in Malaysia time', () => {
    expect(formatDayMonth('2026-09-26T04:00:00+00:00')).toBe('26 Sep')
    expect(formatDayMonth('2026-09-30T16:30:00+00:00')).toBe('1 Oct')
  })

  it('adds the year only for a day in another year than now', () => {
    expect(formatDayMonth('2026-09-26T04:00:00+00:00', '2026-10-01T12:00:00+08:00')).toBe('26 Sep')
    expect(formatDayMonth('2025-12-20T04:00:00+00:00', '2026-01-02T12:00:00+08:00')).toBe(
      '20 Dec 2025',
    )
  })
})

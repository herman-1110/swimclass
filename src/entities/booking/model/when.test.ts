import { describe, expect, it } from 'vitest'

import { isSameMytDay, lessonDateRange, lessonWhen } from './when'

const NOW = '2026-09-26T12:00:00+08:00'

describe('lessonWhen', () => {
  it('says Today for a lesson on today’s Malaysia date', () => {
    expect(lessonWhen('2026-09-26T09:00:00+00:00', '2026-09-26T10:00:00+00:00', NOW)).toBe(
      'Today, 5:00–6:00 pm',
    )
  })

  it('gives the day for any other date', () => {
    expect(lessonWhen('2026-10-03T01:00:00+00:00', '2026-10-03T02:00:00+00:00', NOW)).toBe(
      'Sat 3 Oct, 9:00–10:00 am',
    )
    expect(lessonWhen('2026-10-04T02:00:00+00:00', '2026-10-04T04:00:00+00:00', NOW)).toBe(
      'Sun 4 Oct, 10:00 am–12:00 pm',
    )
  })
})

describe('lessonDateRange', () => {
  it('always gives the day, even today', () => {
    expect(lessonDateRange('2026-09-26T09:00:00+00:00', '2026-09-26T10:00:00+00:00')).toBe(
      'Sat 26 Sep, 5:00–6:00 pm',
    )
  })

  it('adds the year only for a lesson in another year than now', () => {
    expect(lessonDateRange('2026-09-25T11:30:00+00:00', '2026-09-25T12:30:00+00:00', NOW)).toBe(
      'Fri 25 Sep, 7:30–8:30 pm',
    )
    // 11:30 pm UTC on 31 Dec 2025 is already Thu 1 Jan 2026 in Malaysia.
    expect(
      lessonDateRange(
        '2025-12-31T23:30:00+00:00',
        '2026-01-01T00:30:00+00:00',
        '2025-12-31T12:00:00+08:00',
      ),
    ).toBe('Thu 1 Jan 2026, 7:30–8:30 am')
    expect(lessonDateRange('2025-12-12T11:30:00+00:00', '2025-12-12T12:30:00+00:00', NOW)).toBe(
      'Fri 12 Dec 2025, 7:30–8:30 pm',
    )
  })
})

describe('isSameMytDay', () => {
  it('compares Malaysia dates, not the device’s', () => {
    // 11:30 pm and 4:30 pm UTC on 30 Sep are 1 Oct and 1 Oct in Malaysia.
    expect(isSameMytDay('2026-09-30T23:30:00Z', '2026-09-30T16:30:00Z')).toBe(true)
    expect(isSameMytDay('2026-09-30T15:59:00Z', '2026-09-30T16:00:00Z')).toBe(false)
  })
})

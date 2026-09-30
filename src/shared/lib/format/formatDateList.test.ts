import { describe, expect, it } from 'vitest'

import { formatDateList } from './formatDateList'

// The tests run in America/Los_Angeles (vite.config.ts), where a date read as UTC midnight
// would land on the day before.

describe('formatDateList', () => {
  it('writes one date as "Sun 4 Oct"', () => {
    expect(formatDateList(['2026-10-04'])).toBe('Sun 4 Oct')
  })

  it('joins two dates with "and"', () => {
    expect(formatDateList(['2026-10-13', '2026-10-20'])).toBe('Tue 13 Oct and Tue 20 Oct')
  })

  it('joins more dates with commas, then "and"', () => {
    expect(formatDateList(['2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20'])).toBe(
      'Tue 29 Sep, Tue 6 Oct, Tue 13 Oct and Tue 20 Oct',
    )
  })

  it('gives an empty string for no dates', () => {
    expect(formatDateList([])).toBe('')
  })

  it('refuses anything that is not a real date', () => {
    expect(() => formatDateList(['2026-02-30'])).toThrow(RangeError)
    expect(() => formatDateList(['4 Oct'])).toThrow(RangeError)
  })
})

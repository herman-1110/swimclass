import { describe, expect, it } from 'vitest'

import { bookableWindow } from './bookableWindow'

describe('bookableWindow', () => {
  it('runs from this week to the Sunday booking_window_weeks later (Book §1.6)', () => {
    // FIXTURE_NOW is Sat 26 Sep 2026; the seed's window is 4 weeks.
    expect(bookableWindow('2026-09-26', 4)).toEqual({
      thisWeek: '2026-09-21',
      lastWeek: '2026-10-19',
      lastBookableDay: '2026-10-25',
      weekStarts: ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'],
    })
  })

  it('starts on a Monday whichever day today is', () => {
    expect(bookableWindow('2026-09-21', 1).thisWeek).toBe('2026-09-21')
    expect(bookableWindow('2026-09-27', 1)).toMatchObject({
      thisWeek: '2026-09-21',
      lastBookableDay: '2026-10-04',
    })
  })

  it('offers only this week with a window of 0', () => {
    expect(bookableWindow('2026-09-26', 0)).toEqual({
      thisWeek: '2026-09-21',
      lastWeek: '2026-09-21',
      lastBookableDay: '2026-09-27',
      weekStarts: ['2026-09-21'],
    })
  })

  it('refuses a window that isn’t a whole number of weeks', () => {
    expect(() => bookableWindow('2026-09-26', -1)).toThrow(RangeError)
    expect(() => bookableWindow('2026-09-26', 1.5)).toThrow(RangeError)
  })
})

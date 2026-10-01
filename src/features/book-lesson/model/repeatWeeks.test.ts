import { describe, expect, it } from 'vitest'

import { lessonsPerBooking, repeatLabel, repeatWeeks } from './repeatWeeks'

// At Sat 26 Sep 2026 with a 4-week window, the last bookable day is Sun 25 Oct (book §1.6).
const LAST = '2026-10-25'

describe('lessonsPerBooking', () => {
  it('counts an hour as one lesson and two hours as two (CLAUDE.md rule 5)', () => {
    expect(lessonsPerBooking(60)).toBe(1)
    expect(lessonsPerBooking(120)).toBe(2)
  })
})

describe('repeatWeeks', () => {
  it('takes the smaller of what the credit and the booking window allow (book §5.2.4)', () => {
    // Aiman & Sofia can still book 6 lessons; Tue 29 Sep, 6, 13 and 20 Oct are in the window.
    expect(
      repeatWeeks({
        canStillBook: 6,
        lessonsPerBooking: 1,
        day: '2026-09-29',
        lastBookableDay: LAST,
      }),
    ).toBe(4)
    // Two hours: 6 lessons make 3 weeks.
    expect(
      repeatWeeks({
        canStillBook: 6,
        lessonsPerBooking: 2,
        day: '2026-09-29',
        lastBookableDay: LAST,
      }),
    ).toBe(3)
    // Sofia can still book 4: two 2-hour lessons.
    expect(
      repeatWeeks({
        canStillBook: 4,
        lessonsPerBooking: 2,
        day: '2026-09-29',
        lastBookableDay: LAST,
      }),
    ).toBe(2)
  })

  it('counts every week from the chosen day up to the last bookable day', () => {
    // Sun 27 Sep, 4, 11, 18 and 25 Oct.
    expect(
      repeatWeeks({
        canStillBook: 6,
        lessonsPerBooking: 1,
        day: '2026-09-27',
        lastBookableDay: LAST,
      }),
    ).toBe(5)
    expect(
      repeatWeeks({ canStillBook: 9, lessonsPerBooking: 1, day: LAST, lastBookableDay: LAST }),
    ).toBe(1)
  })

  it('gives 1 or less when the credit allows one lesson or none', () => {
    // Wei Jie can still book 1.
    expect(
      repeatWeeks({
        canStillBook: 1,
        lessonsPerBooking: 1,
        day: '2026-09-29',
        lastBookableDay: LAST,
      }),
    ).toBe(1)
    expect(
      repeatWeeks({
        canStillBook: 1,
        lessonsPerBooking: 2,
        day: '2026-09-29',
        lastBookableDay: LAST,
      }),
    ).toBe(0)
    expect(
      repeatWeeks({
        canStillBook: -2,
        lessonsPerBooking: 1,
        day: '2026-09-29',
        lastBookableDay: LAST,
      }),
    ).toBe(0)
  })
})

describe('repeatLabel', () => {
  it('names the second week when there are two (DESIGN §4 item 7)', () => {
    expect(repeatLabel(2, '2026-09-29')).toBe('Repeat weekly: also book Tue 6 Oct')
    expect(repeatLabel(2, '2026-10-25')).toBe('Repeat weekly: also book Sun 1 Nov')
  })

  it('counts the weeks otherwise (prompt 06 TASK 5)', () => {
    expect(repeatLabel(4, '2026-09-29')).toBe('Repeat weekly for 4 weeks')
    expect(repeatLabel(5, '2026-09-27')).toBe('Repeat weekly for 5 weeks')
  })
})

import { describe, expect, it } from 'vitest'

import { bookedHeading, bookedWhen } from './booked'

// Tue 29 Sep 2026, 7:30 pm MYT, as week_slots sends it (UTC text).
const TUE_730 = '2026-09-29T11:30:00+00:00'

describe('bookedHeading', () => {
  it('keeps the button’s words in the past tense (DESIGN §6)', () => {
    expect(bookedHeading(TUE_730, 'Aiman & Sofia')).toBe('Booked 7:30 pm for Aiman & Sofia')
  })
})

describe('bookedWhen', () => {
  it('gives one lesson’s day and time', () => {
    expect(bookedWhen(TUE_730, 60, 1)).toBe('Tue 29 Sep · 7:30–8:30 pm')
    expect(bookedWhen(TUE_730, 120, 1)).toBe('Tue 29 Sep · 7:30–9:30 pm')
  })

  it('lists every week of a weekly booking (book §5.3.2)', () => {
    expect(bookedWhen(TUE_730, 60, 4)).toBe(
      'Tue 29 Sep, Tue 6 Oct, Tue 13 Oct and Tue 20 Oct · 7:30–8:30 pm',
    )
    expect(bookedWhen(TUE_730, 60, 2)).toBe('Tue 29 Sep and Tue 6 Oct · 7:30–8:30 pm')
  })

  it('reads the day in Malaysia time, not UTC', () => {
    // Sun 4 Oct 7:00 am MYT is still Sat 3 Oct in UTC.
    expect(bookedWhen('2026-10-03T23:00:00+00:00', 60, 1)).toBe('Sun 4 Oct · 7:00–8:00 am')
  })
})

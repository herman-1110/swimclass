import { describe, expect, it } from 'vitest'

import { alreadyBookedText } from './alreadyBooked'

const A_AND_S = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const groups = [
  { group_id: A_AND_S, display_names: 'Aiman & Sofia' },
  { group_id: SOFIA, display_names: 'Sofia' },
]

describe('alreadyBookedText', () => {
  it('names the account’s lesson that day (DESIGN §4 item 6)', () => {
    const lessons = [
      {
        group_id: A_AND_S,
        starts_at: '2026-10-03T09:00:00+08:00',
        ends_at: '2026-10-03T10:00:00+08:00',
      },
    ]
    expect(alreadyBookedText(lessons, groups)).toBe(
      'Already booked this day: Aiman & Sofia, 9:00–10:00 am',
    )
  })

  it('lists several lessons in start order, joined with "; " (book Q15)', () => {
    const lessons = [
      {
        group_id: A_AND_S,
        starts_at: '2026-10-03T09:00:00+08:00',
        ends_at: '2026-10-03T10:00:00+08:00',
      },
      {
        group_id: SOFIA,
        starts_at: '2026-10-03T11:00:00+08:00',
        ends_at: '2026-10-03T12:00:00+08:00',
      },
    ]
    expect(alreadyBookedText(lessons, groups)).toBe(
      'Already booked this day: Aiman & Sofia, 9:00–10:00 am; Sofia, 11:00 am–12:00 pm',
    )
  })

  it('gives the time alone for a group it can’t name', () => {
    const lessons = [
      {
        group_id: 'c0000000-0000-4000-8000-000000000099',
        starts_at: '2026-10-04T17:00:00+08:00',
        ends_at: '2026-10-04T18:00:00+08:00',
      },
    ]
    expect(alreadyBookedText(lessons, groups)).toBe('Already booked this day: 5:00–6:00 pm')
  })

  it('gives null when there is no lesson that day', () => {
    expect(alreadyBookedText([], groups)).toBeNull()
  })
})

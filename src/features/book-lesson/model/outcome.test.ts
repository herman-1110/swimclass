import { describe, expect, it } from 'vitest'

import { bookedOutcome, choiceKey } from './outcome'

const A_AND_S = 'c0000000-0000-4000-8000-000000000001'

describe('choiceKey', () => {
  it('changes with the group, day, length and start', () => {
    const key = choiceKey(A_AND_S, '2026-09-29', 60, '2026-09-29T11:30:00+00:00')
    expect(choiceKey(A_AND_S, '2026-09-29', 60, '2026-09-29T11:30:00+00:00')).toBe(key)
    expect(choiceKey(A_AND_S, '2026-09-29', 120, '2026-09-29T11:30:00+00:00')).not.toBe(key)
    expect(choiceKey(A_AND_S, '2026-09-29', 60, null)).not.toBe(key)
    expect(choiceKey(A_AND_S, null, 60, null)).not.toBe(choiceKey(A_AND_S, '2026-09-29', 60, null))
  })
})

describe('bookedOutcome', () => {
  it('belongs to the same choice once the booked time is forgotten', () => {
    const booked = { groupId: A_AND_S, startsAt: '2026-09-29T11:30:00+00:00', minutes: 60 }
    expect(bookedOutcome(booked, 1, 'Aiman & Sofia')).toEqual({
      key: choiceKey(A_AND_S, '2026-09-29', 60, null),
      kind: 'booked',
      heading: 'Booked 7:30 pm for Aiman & Sofia',
      when: 'Tue 29 Sep · 7:30–8:30 pm',
    })
  })
})

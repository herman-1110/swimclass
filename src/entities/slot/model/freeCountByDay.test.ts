import { describe, expect, it } from 'vitest'

import { freeCountByDay, slotsOfDay } from './freeCountByDay'

const rows = [
  { day: '2026-09-29', starts_at: '2026-09-29T09:30:00+00:00', ok: false },
  { day: '2026-09-29', starts_at: '2026-09-29T11:30:00+00:00', ok: true },
  { day: '2026-09-29', starts_at: '2026-09-29T12:00:00+00:00', ok: true },
  { day: '2026-10-01', starts_at: '2026-10-01T09:30:00+00:00', ok: false },
  // Sat 3 Oct 7:00 am MYT is still 2 Oct in UTC: the day column decides.
  { day: '2026-10-03', starts_at: '2026-10-02T23:00:00+00:00', ok: true },
]

describe('freeCountByDay', () => {
  it('counts the free starts of each day by its MYT date', () => {
    const counts = freeCountByDay(rows)
    expect(counts.get('2026-09-29')).toBe(2)
    expect(counts.get('2026-10-03')).toBe(1)
    expect(counts.get('2026-10-02')).toBeUndefined()
  })

  it('counts 0 for a day whose starts are all crossed out', () => {
    expect(freeCountByDay(rows).get('2026-10-01')).toBe(0)
  })

  it('leaves out a day with no start at all', () => {
    expect(freeCountByDay([]).size).toBe(0)
  })
})

describe('slotsOfDay', () => {
  it('keeps the rows of one MYT date, in order', () => {
    expect(slotsOfDay(rows, '2026-09-29').map((slot) => slot.starts_at)).toEqual([
      '2026-09-29T09:30:00+00:00',
      '2026-09-29T11:30:00+00:00',
      '2026-09-29T12:00:00+00:00',
    ])
    expect(slotsOfDay(rows, '2026-10-03')).toHaveLength(1)
    expect(slotsOfDay(rows, '2026-10-02')).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'

import { dayStripDays } from './days'

describe('dayStripDays', () => {
  it('names each day with its free start times, dotting the days that have some (book §5.2.2)', () => {
    // Week of 28 Sep, an hour, as meiling (book §8.2): Mon 1, Tue 4, Wed 3, Thu 0, Fri 1, Sat 6, Sun 1.
    const counts = new Map([
      ['2026-09-28', 1],
      ['2026-09-29', 4],
      ['2026-09-30', 3],
      ['2026-10-01', 0],
      ['2026-10-02', 1],
      ['2026-10-03', 6],
      ['2026-10-04', 1],
    ])
    const days = dayStripDays('2026-09-28', '2026-09-26', counts)
    expect(days.map((day) => day.label)).toEqual([
      'Mon 28 Sep, 1 free start time',
      'Tue 29 Sep, 4 free start times',
      'Wed 30 Sep, 3 free start times',
      'Thu 1 Oct, fully booked',
      'Fri 2 Oct, 1 free start time',
      'Sat 3 Oct, 6 free start times',
      'Sun 4 Oct, 1 free start time',
    ])
    expect(days[1]).toEqual({
      key: '2026-09-29',
      weekday: 'Tue',
      date: '29',
      label: 'Tue 29 Sep, 4 free start times',
      dot: true,
      dimmed: false,
    })
    expect(days[3]).toMatchObject({ weekday: 'Thu', date: '1', dot: false, dimmed: true })
  })

  it('counts a day with no start at all (closed) as fully booked', () => {
    const [monday] = dayStripDays('2026-10-05', '2026-09-26', new Map())
    expect(monday).toMatchObject({ label: 'Mon 5 Oct, fully booked', dot: false, dimmed: true })
  })

  it('disables the days already past (C20)', () => {
    const days = dayStripDays('2026-09-21', '2026-09-26', new Map([['2026-09-27', 20]]))
    expect(days.slice(0, 5).map((day) => [day.label, day.disabled])).toEqual([
      ['Mon 21 Sep, past', true],
      ['Tue 22 Sep, past', true],
      ['Wed 23 Sep, past', true],
      ['Thu 24 Sep, past', true],
      ['Fri 25 Sep, past', true],
    ])
    expect(days[5]).toMatchObject({ label: 'Sat 26 Sep, fully booked', dimmed: true })
    expect(days[6]).toMatchObject({ label: 'Sun 27 Sep, 20 free start times', dot: true })
  })

  it('shows the dates without counts while the start times load', () => {
    const days = dayStripDays('2026-09-28', '2026-09-26', null)
    expect(days[0]).toEqual({ key: '2026-09-28', weekday: 'Mon', date: '28', label: 'Mon 28 Sep' })
  })
})

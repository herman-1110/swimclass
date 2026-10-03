import { describe, expect, it } from 'vitest'

import {
  coachHourLabel,
  customerHourLabel,
  dayHeading,
  formatCoachWeekLabel,
  formatDayKey,
  formatDayLong,
  formatRangeCompact,
  formatWeekLabel,
} from './labels'

describe('hour labels', () => {
  it('writes the customer’s without a space (design/Schedule.dc.html)', () => {
    expect([420, 720, 780, 1260].map(customerHourLabel)).toEqual(['7am', '12pm', '1pm', '9pm'])
    expect(customerHourLabel(0)).toBe('12am')
  })

  it('writes the coach’s with a space (design/AdminSchedule.dc.html)', () => {
    expect([420, 720, 780, 1260].map(coachHourLabel)).toEqual(['7 am', '12 pm', '1 pm', '9 pm'])
    expect(coachHourLabel(0)).toBe('12 am')
  })
})

describe('days', () => {
  it('writes a date short and long', () => {
    expect(formatDayKey('2026-10-03')).toBe('Sat 3 Oct')
    expect(formatDayLong('2026-10-03')).toBe('Saturday 3 Oct')
    expect(formatDayLong('2026-09-28')).toBe('Monday 28 Sep')
  })

  it('splits a header into weekday and date', () => {
    expect(dayHeading('2026-10-01')).toEqual({ weekday: 'Thu', date: '1' })
  })
})

describe('week labels', () => {
  it('gives the customer the drawn pattern, also inside one month', () => {
    expect(formatWeekLabel('2026-09-28')).toBe('28 Sep – 4 Oct')
    expect(formatWeekLabel('2026-09-21')).toBe('21–27 Sep')
  })

  it('gives the coach the year, once', () => {
    expect(formatCoachWeekLabel('2026-09-28')).toBe('28 Sep – 4 Oct 2026')
    expect(formatCoachWeekLabel('2026-09-21')).toBe('21–27 Sep 2026')
    expect(formatCoachWeekLabel('2026-12-28')).toBe('28 Dec 2026 – 3 Jan 2027')
  })
})

describe('formatRangeCompact', () => {
  it('keeps formatRange when both ends share am or pm', () => {
    expect(formatRangeCompact('2026-10-03T09:00:00+08:00', '2026-10-03T10:00:00+08:00')).toBe(
      '9:00–10:00 am',
    )
    expect(formatRangeCompact('2026-10-02T19:30:00+08:00', '2026-10-02T20:30:00+08:00')).toBe(
      '7:30–8:30 pm',
    )
  })

  it('drops ":00" from whole hours when am and pm differ, as drawn', () => {
    expect(formatRangeCompact('2026-10-03T11:00:00+08:00', '2026-10-03T12:00:00+08:00')).toBe(
      '11 am–12 pm',
    )
    expect(formatRangeCompact('2026-10-04T10:00:00+08:00', '2026-10-04T12:00:00+08:00')).toBe(
      '10 am–12 pm',
    )
    expect(formatRangeCompact('2026-10-04T11:30:00+08:00', '2026-10-04T12:30:00+08:00')).toBe(
      '11:30 am–12:30 pm',
    )
  })
})

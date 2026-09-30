import { describe, expect, it } from 'vitest'

import {
  formatHoursRange,
  formatTimeOfDay,
  rangesByWeekday,
  timeOfDayMinutes,
  weekdayName,
  WEEKDAYS,
} from './hours'
import type { WeeklyRange } from './types'

describe('timeOfDayMinutes', () => {
  it('reads Postgres times, with or without seconds, up to midnight', () => {
    expect(timeOfDayMinutes('17:30:00')).toBe(1050)
    expect(timeOfDayMinutes('07:00')).toBe(420)
    expect(timeOfDayMinutes('00:00:00')).toBe(0)
    expect(timeOfDayMinutes('24:00:00')).toBe(1440)
  })

  it('refuses anything that isn’t a time of day', () => {
    for (const bad of ['5pm', '7:30', '24:30', '12:60', '']) {
      expect(() => timeOfDayMinutes(bad)).toThrow(RangeError)
    }
  })
})

describe('formatTimeOfDay', () => {
  it('writes times like every time in the app', () => {
    expect(formatTimeOfDay('20:00:00')).toBe('8:00 pm')
    expect(formatTimeOfDay('12:00:00')).toBe('12:00 pm')
    expect(formatTimeOfDay('07:15')).toBe('7:15 am')
    expect(formatTimeOfDay('24:00:00')).toBe('12:00 am')
  })
})

describe('formatHoursRange', () => {
  it('writes am or pm once when both ends share it (coach-settings §9 C1)', () => {
    expect(formatHoursRange('17:30:00', '22:00:00')).toBe('5:30–10:00 pm')
    expect(formatHoursRange('16:00:00', '22:00:00')).toBe('4:00–10:00 pm')
    expect(formatHoursRange('12:00:00', '13:00:00')).toBe('12:00–1:00 pm')
  })

  it('writes both when they differ, and midnight as 12:00 am', () => {
    expect(formatHoursRange('07:00:00', '12:00:00')).toBe('7:00 am–12:00 pm')
    expect(formatHoursRange('17:30:00', '24:00:00')).toBe('5:30 pm–12:00 am')
  })
})

describe('weekdays', () => {
  it('names each ISO weekday short and long', () => {
    expect(WEEKDAYS.map((day) => weekdayName(day))).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
    expect(weekdayName(1, 'long')).toBe('Monday')
    expect(weekdayName(7, 'long')).toBe('Sunday')
  })

  it('groups the weekly ranges into the 7 days, each in opening order', () => {
    const ranges: WeeklyRange[] = [
      { weekday: 6, opens_at: '16:00:00', closes_at: '22:00:00' },
      { weekday: 1, opens_at: '17:30:00', closes_at: '22:00:00' },
      { weekday: 6, opens_at: '07:00:00', closes_at: '12:00:00' },
    ]
    const days = rangesByWeekday(ranges)
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual([ranges[1]])
    expect(days[1]).toEqual([])
    expect(days[5]).toEqual([ranges[2], ranges[0]])
  })
})

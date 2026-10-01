import { describe, expect, it } from 'vitest'

import {
  datesFrom,
  daysToSave,
  END_OF_DAY,
  endChoices,
  isDateKey,
  minuteOf,
  rangeOn,
  startChoices,
  stepAfter,
  stepBefore,
  timeLabel,
  timeValue,
  weeksOf,
} from './times'

describe('a time of day', () => {
  it('goes to and from a select’s value', () => {
    expect(timeValue(420)).toBe('07:00')
    expect(timeValue(1050)).toBe('17:30')
    expect(timeValue(END_OF_DAY)).toBe('24:00')
    expect(minuteOf('17:30')).toBe(1050)
    expect(minuteOf('24:00')).toBe(1440)
    expect(minuteOf('')).toBeNull()
    expect(minuteOf('25:00')).toBeNull()
  })

  it('reads like every other time, and the day’s end says midnight', () => {
    expect(timeLabel(0)).toBe('12:00 am')
    expect(timeLabel(720)).toBe('12:00 pm')
    expect(timeLabel(1050)).toBe('5:30 pm')
    expect(timeLabel(END_OF_DAY)).toBe('12:00 am (midnight)')
  })
})

describe('the From and To choices', () => {
  it('are every start step from midnight (prompt 08 TASK 5)', () => {
    const starts = startChoices(30)
    expect(starts).toHaveLength(48)
    expect(starts.slice(0, 3)).toEqual([0, 30, 60])
    expect(starts.at(-1)).toBe(1410)
    expect(startChoices(60)).toHaveLength(24)
    expect(startChoices(15).slice(0, 4)).toEqual([0, 15, 30, 45])
  })

  it('end one step after From, up to midnight', () => {
    expect(endChoices(30, 1200)).toEqual([1230, 1260, 1290, 1320, 1350, 1380, 1410, 1440])
    expect(endChoices(60, null)).toHaveLength(24)
    expect(endChoices(60, null)[0]).toBe(60)
    expect(endChoices(30, 1410)).toEqual([1440])
  })

  it('round a time onto the steps', () => {
    expect(stepBefore(1050, 60)).toBe(1020)
    expect(stepBefore(1050, 30)).toBe(1050)
    expect(stepAfter(1290, 60)).toBe(1320)
    expect(stepAfter(1439, 60)).toBe(1440)
  })
})

describe('rangeOn', () => {
  it('is that day’s moments in Malaysia time', () => {
    const range = rangeOn('2026-10-03', 420, 540)
    expect(range.startsAt.toISOString()).toBe('2026-10-02T23:00:00.000Z')
    expect(range.endsAt.toISOString()).toBe('2026-10-03T01:00:00.000Z')
  })

  it('ends at the next day’s midnight for "12:00 am (midnight)"', () => {
    expect(rangeOn('2026-10-04', 1200, END_OF_DAY).endsAt.toISOString()).toBe(
      '2026-10-04T16:00:00.000Z',
    )
  })
})

describe('the days of a range', () => {
  it('lists each day from the first to the last', () => {
    expect(datesFrom('2026-10-03', null)).toEqual(['2026-10-03'])
    expect(datesFrom('2026-09-30', '2026-10-02')).toEqual([
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ])
  })

  it('names each week they touch once, by its Monday', () => {
    expect(weeksOf(datesFrom('2026-10-03', '2026-10-06'))).toEqual(['2026-09-28', '2026-10-05'])
  })

  it('saves the date alone, or each day up to Until, and nothing while Until comes first', () => {
    expect(daysToSave('2026-10-03', '')).toEqual({ dates: ['2026-10-03'], untilBefore: false })
    expect(daysToSave('2026-10-03', '2026-10-04')).toEqual({
      dates: ['2026-10-03', '2026-10-04'],
      untilBefore: false,
    })
    expect(daysToSave('2026-10-03', '2026-10-01')).toEqual({
      dates: ['2026-10-03'],
      untilBefore: true,
    })
    expect(daysToSave('', '2026-10-04')).toEqual({ dates: [], untilBefore: false })
  })

  it('knows a real date from a cleared or impossible one', () => {
    expect(isDateKey('2026-10-03')).toBe(true)
    expect(isDateKey('')).toBe(false)
    expect(isDateKey('2026-02-30')).toBe(false)
  })
})

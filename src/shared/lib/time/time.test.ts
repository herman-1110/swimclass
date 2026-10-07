import { describe, expect, it } from 'vitest'

import {
  addDays,
  formatDay,
  formatDayMonth,
  formatDayMonthYear,
  formatRange,
  formatTime,
  MYT,
  mytDateKey,
  mytInstant,
  mytWeekStart,
  nowMyt,
  parseDateKey,
  toMyt,
  weekDays,
} from './time'

describe('formatDayMonth', () => {
  it('writes a moment as its day in Malaysia time', () => {
    expect(formatDayMonth('2026-09-26T04:00:00+00:00')).toBe('26 Sep')
    // 11:30 pm UTC on 30 Sep is already 1 Oct in Malaysia.
    expect(formatDayMonth('2026-09-30T23:30:00+00:00')).toBe('1 Oct')
  })

  it('reads a date column as that day, whatever the device’s time zone', () => {
    expect(formatDayMonth('2026-09-19')).toBe('19 Sep')
    expect(formatDayMonth('2026-08-01')).toBe('1 Aug')
  })

  it('adds the year only for a day in another year than now', () => {
    const now = '2026-09-26T12:00:00+08:00'
    expect(formatDayMonth('2026-09-18T11:30:00+00:00', now)).toBe('18 Sep')
    expect(formatDayMonth('2025-12-18T11:30:00+00:00', now)).toBe('18 Dec 2025')
    expect(formatDayMonth('2025-12-12', '2026-01-05T12:00:00+08:00')).toBe('12 Dec 2025')
  })
})

describe('formatDayMonthYear', () => {
  it('always gives the year', () => {
    expect(formatDayMonthYear('2026-08-29')).toBe('29 Aug 2026')
    expect(formatDayMonthYear('2026-09-30T23:30:00+00:00')).toBe('1 Oct 2026')
  })
})

describe('addDays', () => {
  it('moves by whole MYT days, across months and years', () => {
    expect(addDays('2026-09-28', 7)).toBe('2026-10-05')
    expect(addDays('2026-10-04', -6)).toBe('2026-09-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-09-26', 0)).toBe('2026-09-26')
  })

  it('is not moved by the device’s daylight saving change', () => {
    // Los Angeles changes its clocks on Sun 1 Nov 2026; Malaysia never does.
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
  })

  it('refuses a date that isn’t one', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
  })
})

describe('weekDays', () => {
  it('lists the seven dates of a week, Monday first', () => {
    expect(weekDays('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
  })
})

describe('test setup', () => {
  it('runs with a device time zone that is not Malaysia', () => {
    // vite.config.ts sets TZ. If this fails, the tests below can't catch code that
    // accidentally uses the device's time zone.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles')
    expect(new Date('2026-09-26T04:00:00Z').getTimezoneOffset()).not.toBe(-480)
  })
})

describe('formatTime', () => {
  it('formats 19:30 MYT as "7:30 pm"', () => {
    expect(formatTime('2026-10-03T19:30:00+08:00')).toBe('7:30 pm')
    expect(formatTime(mytInstant('2026-10-03', '19:30'))).toBe('7:30 pm')
  })

  it('reads a UTC instant in Malaysia time', () => {
    expect(formatTime('2026-10-03T11:30:00Z')).toBe('7:30 pm')
    expect(formatTime('2026-10-03T11:30:00+00:00')).toBe('7:30 pm')
  })

  it('accepts a Date, epoch milliseconds and the Postgres text format', () => {
    const instant = new Date('2026-10-03T01:00:00Z')
    expect(formatTime(instant)).toBe('9:00 am')
    expect(formatTime(instant.getTime())).toBe('9:00 am')
    expect(formatTime('2026-10-03 01:00:00+00')).toBe('9:00 am')
  })

  it('writes noon as pm and midnight as am', () => {
    expect(formatTime('2026-10-03T12:00:00+08:00')).toBe('12:00 pm')
    expect(formatTime('2026-10-03T00:00:00+08:00')).toBe('12:00 am')
  })
})

describe('formatDay', () => {
  it('formats as "Sat 3 Oct"', () => {
    expect(formatDay('2026-10-03T09:00:00+08:00')).toBe('Sat 3 Oct')
    expect(formatDay('2026-09-29T17:30:00+08:00')).toBe('Tue 29 Sep')
  })
})

describe('formatRange', () => {
  it('writes am or pm once when both ends share it', () => {
    expect(formatRange('2026-10-03T09:00:00+08:00', '2026-10-03T10:00:00+08:00')).toBe(
      '9:00–10:00 am',
    )
    expect(formatRange('2026-09-29T17:30:00+08:00', '2026-09-29T18:30:00+08:00')).toBe(
      '5:30–6:30 pm',
    )
  })

  it('writes both when the range crosses noon', () => {
    expect(formatRange('2026-10-03T11:00:00+08:00', '2026-10-03T12:00:00+08:00')).toBe(
      '11:00 am–12:00 pm',
    )
    expect(formatRange('2026-10-04T10:00:00+08:00', '2026-10-04T12:00:00+08:00')).toBe(
      '10:00 am–12:00 pm',
    )
  })

  it('treats a range starting at noon as all pm', () => {
    expect(formatRange('2026-10-03T12:00:00+08:00', '2026-10-03T13:00:00+08:00')).toBe(
      '12:00–1:00 pm',
    )
  })

  it('uses an en dash', () => {
    expect(formatRange('2026-10-03T09:00:00+08:00', '2026-10-03T10:00:00+08:00')).toContain('–')
  })
})

describe('a UTC instant that is a different calendar day in MYT', () => {
  // Wed 30 Sep 17:00 UTC (still Wed 30 Sep on the test machine) = Thu 1 Oct 1:00 am MYT
  const instant = '2026-09-30T17:00:00Z'

  it('is Wednesday in UTC and on the device', () => {
    expect(new Date(instant).getUTCDate()).toBe(30)
    expect(new Date(instant).getDate()).toBe(30)
  })

  it('is Thursday 1 October in Malaysia', () => {
    expect(mytDateKey(instant)).toBe('2026-10-01')
    expect(formatDay(instant)).toBe('Thu 1 Oct')
    expect(formatTime(instant)).toBe('1:00 am')
  })
})

describe('mytInstant', () => {
  it('turns an MYT date and time into the right moment', () => {
    expect(mytInstant('2026-10-03', '19:30').toISOString()).toBe('2026-10-03T11:30:00.000Z')
    expect(mytInstant('2026-10-03', '09:00:00').toISOString()).toBe('2026-10-03T01:00:00.000Z')
  })

  it('handles times just after midnight MYT (the previous day in UTC)', () => {
    expect(mytInstant('2026-10-03', '00:30').toISOString()).toBe('2026-10-02T16:30:00.000Z')
  })

  it('rejects impossible or badly formatted values', () => {
    expect(() => mytInstant('2026-02-30', '09:00')).toThrow(RangeError)
    expect(() => mytInstant('2026-10-03', '24:00')).toThrow(RangeError)
    expect(() => mytInstant('2026-10-03', '7:30')).toThrow(RangeError)
    expect(() => mytInstant('3 Oct 2026', '07:30')).toThrow(RangeError)
  })
})

describe('mytWeekStart', () => {
  it('returns the Monday of the week for a date', () => {
    expect(mytWeekStart('2026-09-28')).toBe('2026-09-28') // Monday
    expect(mytWeekStart('2026-10-01')).toBe('2026-09-28') // Thursday
    expect(mytWeekStart('2026-10-04')).toBe('2026-09-28') // Sunday
    expect(mytWeekStart('2026-10-05')).toBe('2026-10-05') // next Monday
  })

  it('uses the MYT day of an instant, not the UTC or device day', () => {
    // Sun 27 Sep 16:30 UTC = Mon 28 Sep 00:30 MYT
    expect(mytWeekStart('2026-09-27T16:30:00Z')).toBe('2026-09-28')
  })
})

describe('input checks', () => {
  it('rejects strings without a time and offset, which would parse as UTC', () => {
    expect(() => formatTime('2026-10-03')).toThrow(RangeError)
    expect(() => formatTime('2026-10-03T19:30')).toThrow(RangeError)
    expect(() => formatDay('2026-10-03T19:30:00')).toThrow(RangeError)
  })

  it('rejects values that are not dates', () => {
    expect(() => formatTime('soon 12:00Z')).toThrow(RangeError)
    expect(() => formatTime(Number.NaN)).toThrow(RangeError)
  })
})

describe('toMyt and nowMyt', () => {
  it('return dates in the Malaysia time zone', () => {
    expect(MYT).toBe('Asia/Kuala_Lumpur')
    const saturdayNoon = toMyt('2026-09-26T04:00:00Z')
    expect(saturdayNoon.timeZone).toBe(MYT)
    expect(saturdayNoon.getHours()).toBe(12)
    expect(saturdayNoon.getDay()).toBe(6)
    expect(nowMyt().timeZone).toBe(MYT)
  })
})

describe('parseDateKey', () => {
  it('keeps a real "yyyy-MM-dd" date', () => {
    expect(parseDateKey('2026-10-03')).toBe('2026-10-03')
    expect(parseDateKey('2028-02-29')).toBe('2028-02-29')
  })

  it('gives null for a missing, empty, malformed or impossible date', () => {
    expect(parseDateKey(null)).toBeNull()
    expect(parseDateKey(undefined)).toBeNull()
    expect(parseDateKey('')).toBeNull()
    expect(parseDateKey('2026-2-3')).toBeNull()
    expect(parseDateKey('3 Oct 2026')).toBeNull()
    expect(parseDateKey('2026-02-30')).toBeNull()
    expect(parseDateKey('2026-13-01')).toBeNull()
  })
})

// The student screens in Chinese (HANDOFF v0.26; frontend-plan/notes/i18n-glossary.md).
describe('Chinese dates and times', () => {
  it('puts the part of the day first: 上午 before noon, 下午 to 6 pm, 晚上 after', () => {
    expect(formatTime('2026-10-03T09:00:00+08:00', 'zh')).toBe('上午9:00')
    expect(formatTime('2026-10-03T12:00:00+08:00', 'zh')).toBe('下午12:00')
    expect(formatTime('2026-10-03T17:30:00+08:00', 'zh')).toBe('下午5:30')
    expect(formatTime('2026-10-03T19:30:00+08:00', 'zh')).toBe('晚上7:30')
  })

  it('writes days as month and day, then the weekday', () => {
    expect(formatDay('2026-10-03T09:00:00+08:00', 'zh')).toBe('10月3日 周六')
    expect(formatDayMonth('2026-09-19', undefined, 'zh')).toBe('9月19日')
    expect(formatDayMonth('2025-12-18', '2026-09-26T12:00:00+08:00', 'zh')).toBe('2025年12月18日')
    expect(formatDayMonthYear('2026-09-19', 'zh')).toBe('2026年9月19日')
  })

  it('writes the part of the day once in a range that stays in it', () => {
    expect(formatRange('2026-09-29T19:30:00+08:00', '2026-09-29T20:30:00+08:00', 'zh')).toBe(
      '晚上7:30–8:30',
    )
    expect(formatRange('2026-10-03T11:00:00+08:00', '2026-10-03T12:00:00+08:00', 'zh')).toBe(
      '上午11:00–下午12:00',
    )
  })
})

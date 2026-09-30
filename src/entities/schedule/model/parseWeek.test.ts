import { describe, expect, it } from 'vitest'

import { parseCoachWeek, parseCustomerWeek } from './parseWeek'

const WEEK = '2026-09-28'
const DAYS = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
]

function customerJson(busy: unknown[] = [], day = (i: number) => DAYS[i]) {
  return DAYS.map((_, i) => ({ day: day(i), open: [], closed: [], busy: i === 5 ? busy : [] }))
}

const other = {
  mine: false,
  starts_at: '2026-10-03T11:00:00+08:00',
  ends_at: '2026-10-03T12:00:00+08:00',
  travel_before: 60,
  travel_after: 60,
}

describe('parseCustomerWeek', () => {
  it('keeps the fields the grid uses, and ids only on the viewer’s own lessons', () => {
    const week = parseCustomerWeek(
      customerJson([
        // A name the database never sends: the parser drops anything it doesn't know.
        { ...other, display_names: 'Hana' },
        { ...other, mine: true, booking_id: 'b1', group_id: 'g1' },
      ]),
      WEEK,
    )
    expect(week).toHaveLength(7)
    expect(week[5].busy).toEqual([
      { ...other },
      { ...other, mine: true, booking_id: 'b1', group_id: 'g1' },
    ])
  })

  it.each([
    ['not a list', { days: [] }],
    ['six days', customerJson().slice(1)],
    ['another week', customerJson([], (i) => DAYS[i].replace('2026', '2027'))],
    ['a lesson without its travel', customerJson([{ ...other, travel_after: undefined }])],
    ['a time without an offset', customerJson([{ ...other, starts_at: '2026-10-03T11:00:00' }])],
    ['an own lesson without its ids', customerJson([{ ...other, mine: true }])],
  ])('refuses %s with AppError unknown', (_, json) => {
    expect(() => parseCustomerWeek(json, WEEK)).toThrow(
      expect.objectContaining({ name: 'AppError', code: 'unknown' }),
    )
  })
})

const booked = {
  booking_id: 'd8',
  group_id: 'c4',
  account_id: 'a4',
  account_name: 'Wei Jie',
  display_names: 'Wei Jie',
  type_label: '1-to-1',
  size: 1,
  location: 'Palm Court',
  starts_at: '2026-10-02T19:30:00+08:00',
  ends_at: '2026-10-02T20:30:00+08:00',
  lessons: 1,
  status: 'booked',
  gap_override: false,
  travel_before: 60,
  travel_after: 0,
  used: false,
  package_no: 2,
  lesson_in_package: 3,
  package_size: 4,
  unpaid: true,
  last_lesson: false,
}

function coachJson(lessons: unknown[] = [], exceptions: unknown[] = []) {
  return DAYS.map((day, i) => ({
    day,
    open: [],
    closed: [],
    exceptions: i === 4 ? exceptions : [],
    lessons: i === 4 ? lessons : [],
  }))
}

describe('parseCoachWeek', () => {
  it('reads booked and cancelled lessons and the exceptions with their notes', () => {
    const cancelled = {
      ...booked,
      status: 'cancelled',
      travel_before: null,
      travel_after: null,
      used: null,
      package_no: null,
      lesson_in_package: null,
    }
    const exception = {
      id: 'x1',
      kind: 'closed',
      starts_at: '2026-10-02T16:00:00+08:00',
      ends_at: '2026-10-02T17:00:00+08:00',
      note: 'Pool maintenance',
    }
    const friday = parseCoachWeek(coachJson([booked, cancelled], [exception]), WEEK)[4]
    expect(friday.lessons).toEqual([booked, cancelled])
    expect(friday.exceptions).toEqual([exception])
  })

  it.each([
    ['an unknown status', coachJson([{ ...booked, status: 'moved' }])],
    ['a booked lesson without its package', coachJson([{ ...booked, package_no: null }])],
    ['a 3-hour lesson', coachJson([{ ...booked, lessons: 3 }])],
    ['a group of four', coachJson([{ ...booked, size: 4 }])],
    ['an exception of an unknown kind', coachJson([], [{ id: 'x', kind: 'maybe', note: null }])],
    ['a day without exceptions', coachJson().map((d) => ({ ...d, exceptions: undefined }))],
  ])('refuses %s with AppError unknown', (_, json) => {
    expect(() => parseCoachWeek(json, WEEK)).toThrow(
      expect.objectContaining({ name: 'AppError', code: 'unknown' }),
    )
  })
})

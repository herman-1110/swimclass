import { describe, expect, it } from 'vitest'

import {
  bookBlocker,
  type BookingRequest,
  changesDraft,
  checkArgs,
  clampWeeks,
  endOf,
  lastStartOf,
  newDraft,
  sameBooking,
  startOf,
  weeksOf,
} from './draft'

// Times are Malaysia time whatever the device's zone (the tests run in Los Angeles).

describe('newDraft', () => {
  it('opens on the given day with the first length, no start and no repeat (§6.4)', () => {
    expect(newDraft('2026-10-03')).toEqual({
      groupId: null,
      date: '2026-10-03',
      start: '',
      minutes: null,
      repeat: false,
      weeks: '2',
      ignoreOpenHours: false,
      gapOverride: false,
    })
  })
})

describe('startOf and endOf', () => {
  it('reads the date and time fields as Malaysia time', () => {
    const start = startOf({ date: '2026-09-29', start: '19:30' })
    expect(start?.toISOString()).toBe('2026-09-29T11:30:00.000Z')
    expect(endOf(start as Date, 120).toISOString()).toBe('2026-09-29T13:30:00.000Z')
  })

  it.each([
    ['no start', { date: '2026-09-29', start: '' }],
    ['no date', { date: '', start: '19:30' }],
    ['a date that does not exist', { date: '2026-02-30', start: '19:30' }],
    ['a time that does not exist', { date: '2026-09-29', start: '25:00' }],
  ])('is null with %s', (_, fields) => {
    expect(startOf(fields)).toBeNull()
  })

  it('finds the last week’s start when repeating', () => {
    const last = lastStartOf({ date: '2026-09-29', start: '19:30' }, 3)
    expect(last?.toISOString()).toBe('2026-10-13T11:30:00.000Z')
  })
})

describe('weeksOf', () => {
  it('books one week without repeat, whatever the number says', () => {
    expect(weeksOf({ repeat: false, weeks: '99' })).toBe(1)
  })

  it.each([
    ['2', 2],
    ['52', 52],
    [' 3 ', 3],
  ])('books %s weeks with repeat', (weeks, expected) => {
    expect(weeksOf({ repeat: true, weeks })).toBe(expected)
  })

  it.each(['1', '53', '', '2.5', 'abc', '-3'])('refuses "%s" (2 to 52 only, §9 C14)', (weeks) => {
    expect(weeksOf({ repeat: true, weeks })).toBeNull()
  })
})

describe('bookBlocker', () => {
  const ready = {
    hasGroup: true,
    start: new Date('2026-09-29T11:30:00Z'),
    minutes: 60,
    weeks: 1,
    clash: false,
  }

  it('is null once everything is in and the check found no clash', () => {
    expect(bookBlocker(ready)).toBeNull()
  })

  it('names the first thing missing, in the order of the form (§6.4)', () => {
    expect(bookBlocker({ ...ready, hasGroup: false, start: null })).toBe('group')
    expect(bookBlocker({ ...ready, start: null, minutes: null })).toBe('start')
    expect(bookBlocker({ ...ready, minutes: null })).toBe('length')
    expect(bookBlocker({ ...ready, weeks: null, clash: true })).toBe('weeks')
    expect(bookBlocker({ ...ready, clash: true })).toBe('clash')
  })
})

describe('clampWeeks', () => {
  it.each([
    ['1', '2'],
    ['0', '2'],
    ['60', '52'],
    ['', '2'],
    ['7', '7'],
  ])('puts "%s" back inside 2 to 52 as "%s"', (typed, expected) => {
    expect(clampWeeks(typed)).toBe(expected)
  })
})

describe('checkArgs', () => {
  const draft = { ...newDraft('2026-09-29'), groupId: 'g1', start: '18:30' }

  it('asks about the first week with the coach’s overrides', () => {
    expect(checkArgs({ ...draft, gapOverride: true, repeat: true, weeks: '3' }, 60)).toEqual({
      p_group_id: 'g1',
      p_starts_at: '2026-09-29T10:30:00.000Z',
      p_minutes: 60,
      p_ignore_open_hours: false,
      p_gap_override: true,
    })
  })

  it('waits for a group, a start and the length', () => {
    expect(checkArgs({ ...draft, groupId: null }, 60)).toBeNull()
    expect(checkArgs({ ...draft, start: '' }, 60)).toBeNull()
    expect(checkArgs(draft, null)).toBeNull()
  })
})

describe('changesDraft', () => {
  const draft = { ...newDraft('2026-10-05'), repeat: true, weeks: '3' }

  it('is false for a field left as it was (leaving "Number of weeks", §7.4 step 10)', () => {
    expect(changesDraft(draft, { weeks: '3' })).toBe(false)
    expect(changesDraft(draft, { repeat: true, groupId: null })).toBe(false)
  })

  it('is true as soon as one field changes', () => {
    expect(changesDraft(draft, { weeks: '4' })).toBe(true)
    expect(
      changesDraft(draft, { weeks: '3', groupId: 'c0000000-0000-4000-8000-000000000003' }),
    ).toBe(true)
  })
})

describe('sameBooking', () => {
  const asked: BookingRequest = {
    groupId: 'c0000000-0000-4000-8000-000000000004',
    startsAt: '2026-10-06T09:30:00.000Z',
    minutes: 60,
    repeatWeeks: 2,
    ignoreOpenHours: false,
    gapOverride: false,
  }

  it('matches the booking that was refused, "Book anyway" aside', () => {
    expect(sameBooking({ ...asked, ignoreCredit: false } as BookingRequest, { ...asked })).toBe(
      true,
    )
  })

  it('tells any other group, time, length, weeks or option apart', () => {
    for (const change of [
      { groupId: 'c0000000-0000-4000-8000-000000000003' },
      { startsAt: '2026-10-06T10:30:00.000Z' },
      { minutes: 120 },
      { repeatWeeks: 3 },
      { ignoreOpenHours: true },
      { gapOverride: true },
    ]) {
      expect(sameBooking(asked, { ...asked, ...change })).toBe(false)
    }
  })

  it('is false before anything was asked, or while the form can’t book', () => {
    expect(sameBooking(undefined, asked)).toBe(false)
    expect(sameBooking(asked, null)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { defaultDay, firstFreeDay, hasFutureStart, needsNextWeek } from './defaults'

// At Sat 26 Sep 2026 12:00 MYT: this week starts Mon 21 Sep, the window ends with the week
// of 19 Oct (book §1.6).
const TODAY = '2026-09-26'
const THIS_WEEK = '2026-09-21'
const LAST_WEEK = '2026-10-19'

const past = (day: string) => ({ day, ok: false, reason: 'past' as const })
const clash = (day: string) => ({ day, ok: false, reason: 'overlap_other' as const })
const free = (day: string) => ({ day, ok: true, reason: null })

// The seed's week of 21 Sep for an hour: Mon–Fri passed, Sat 26 crossed out, Sun 27 free.
const SEED_WEEK = [
  past('2026-09-21'),
  past('2026-09-25'),
  past('2026-09-26'),
  clash('2026-09-26'),
  free('2026-09-27'),
  free('2026-09-27'),
]

describe('hasFutureStart', () => {
  it('is true while any start hasn’t passed, free or not', () => {
    expect(hasFutureStart(SEED_WEEK)).toBe(true)
    expect(hasFutureStart([past('2026-09-21'), clash('2026-09-26')])).toBe(true)
  })

  it('is false when every start has passed, or there is none', () => {
    expect(hasFutureStart([past('2026-09-21'), past('2026-09-27')])).toBe(false)
    expect(hasFutureStart([])).toBe(false)
  })
})

describe('firstFreeDay', () => {
  it('finds the first day from the given one with a free start', () => {
    expect(firstFreeDay(SEED_WEEK, TODAY)).toBe('2026-09-27')
    expect(firstFreeDay([free('2026-09-30'), free('2026-09-28')], '2026-09-28')).toBe('2026-09-28')
  })

  it('skips days before the given one, and gives null when nothing is free', () => {
    expect(firstFreeDay([free('2026-09-25')], TODAY)).toBeNull()
    expect(firstFreeDay([clash('2026-09-27')], TODAY)).toBeNull()
  })
})

describe('needsNextWeek', () => {
  it('asks for next week only once this week is known to have nothing left', () => {
    expect(needsNextWeek([past('2026-09-27')], '2026-09-28', LAST_WEEK)).toBe(true)
    expect(needsNextWeek(SEED_WEEK, '2026-09-28', LAST_WEEK)).toBe(false)
    expect(needsNextWeek('pending', '2026-09-28', LAST_WEEK)).toBe(false)
    expect(needsNextWeek('error', '2026-09-28', LAST_WEEK)).toBe(false)
  })

  it('never looks past the booking window', () => {
    expect(needsNextWeek([past('2026-09-27')], '2026-09-28', THIS_WEEK)).toBe(false)
  })
})

describe('defaultDay', () => {
  const base = { today: TODAY, thisWeek: THIS_WEEK, lastWeek: LAST_WEEK }

  it('opens on the first free day from today: Sun 27 Sep in the seed (book §1.5)', () => {
    expect(defaultDay({ ...base, thisWeekSlots: SEED_WEEK, nextWeekSlots: 'pending' })).toEqual({
      weekStart: THIS_WEEK,
      day: '2026-09-27',
    })
  })

  it('opens on today when this week has future starts but none free', () => {
    const full = [past('2026-09-25'), clash('2026-09-26'), clash('2026-09-27')]
    expect(defaultDay({ ...base, thisWeekSlots: full, nextWeekSlots: 'pending' })).toEqual({
      weekStart: THIS_WEEK,
      day: TODAY,
    })
  })

  it('waits for this week’s start times before choosing a day', () => {
    expect(defaultDay({ ...base, thisWeekSlots: 'pending', nextWeekSlots: 'pending' })).toEqual({
      weekStart: THIS_WEEK,
      day: null,
    })
  })

  it('opens on today when this week’s start times fail, so the error shows there', () => {
    expect(defaultDay({ ...base, thisWeekSlots: 'error', nextWeekSlots: 'pending' })).toEqual({
      weekStart: THIS_WEEK,
      day: TODAY,
    })
  })

  it('moves to next week when everything this week has passed', () => {
    const over = [past('2026-09-26'), past('2026-09-27')]
    const nextWeek = [clash('2026-09-28'), free('2026-09-29'), free('2026-10-01')]
    expect(defaultDay({ ...base, thisWeekSlots: over, nextWeekSlots: 'pending' })).toEqual({
      weekStart: '2026-09-28',
      day: null,
    })
    expect(defaultDay({ ...base, thisWeekSlots: over, nextWeekSlots: nextWeek })).toEqual({
      weekStart: '2026-09-28',
      day: '2026-09-29',
    })
    expect(defaultDay({ ...base, thisWeekSlots: over, nextWeekSlots: [] })).toEqual({
      weekStart: '2026-09-28',
      day: '2026-09-28',
    })
    expect(defaultDay({ ...base, thisWeekSlots: over, nextWeekSlots: 'error' })).toEqual({
      weekStart: '2026-09-28',
      day: '2026-09-28',
    })
  })

  it('stays on this week when the window has no next week', () => {
    const over = [past('2026-09-27')]
    expect(
      defaultDay({ ...base, lastWeek: THIS_WEEK, thisWeekSlots: over, nextWeekSlots: 'pending' }),
    ).toEqual({ weekStart: THIS_WEEK, day: TODAY })
  })
})

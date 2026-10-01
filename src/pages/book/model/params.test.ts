import { describe, expect, it } from 'vitest'

import {
  bookSearch,
  chooseGroup,
  chooseLength,
  dayInOtherWeek,
  isBookableDay,
  lessonLengths,
  readBookParams,
} from './params'

const A_AND_S = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'

describe('readBookParams', () => {
  it('reads the four choices (book §1.4)', () => {
    const params = new URLSearchParams(`group=${SOFIA}&day=2026-09-29&length=120&time=19:30`)
    expect(readBookParams(params)).toEqual({
      group: SOFIA,
      day: '2026-09-29',
      length: 120,
      time: '19:30',
    })
  })

  it('reads an encoded colon the same', () => {
    expect(readBookParams(new URLSearchParams('time=19%3A30')).time).toBe('19:30')
  })

  it('drops malformed values silently', () => {
    const params = new URLSearchParams('group=%20&day=2026-02-30&length=1h&time=7:30')
    expect(readBookParams(params)).toEqual({ group: null, day: null, length: null, time: null })
    expect(readBookParams(new URLSearchParams('day=29-09-2026&time=24:00&length=0'))).toEqual({
      group: null,
      day: null,
      length: null,
      time: null,
    })
  })

  it('gives nulls for a bare address', () => {
    expect(readBookParams(new URLSearchParams())).toEqual({
      group: null,
      day: null,
      length: null,
      time: null,
    })
  })
})

describe('bookSearch', () => {
  it('writes the whole choice in a fixed order, the time readable', () => {
    expect(bookSearch({ group: A_AND_S, day: '2026-09-29', length: 60, time: '19:30' })).toBe(
      `?group=${A_AND_S}&day=2026-09-29&length=60&time=19:30`,
    )
  })

  it('leaves out a day still being worked out and an unpicked time', () => {
    expect(bookSearch({ group: A_AND_S, day: null, length: 120, time: null })).toBe(
      `?group=${A_AND_S}&length=120`,
    )
  })

  it('round-trips through readBookParams', () => {
    const choice = { group: SOFIA, day: '2026-10-04', length: 60, time: '21:00' }
    expect(readBookParams(new URLSearchParams(bookSearch(choice)))).toEqual(choice)
  })
})

describe('chooseGroup', () => {
  const groups = [{ group_id: A_AND_S }, { group_id: SOFIA }]

  it('keeps an asked group that is active', () => {
    expect(chooseGroup(SOFIA, groups)).toEqual({ group_id: SOFIA })
  })

  it('falls back to the first active group (book §1.5 step 2)', () => {
    expect(chooseGroup(null, groups)).toEqual({ group_id: A_AND_S })
    expect(chooseGroup('c0000000-0000-4000-8000-000000000003', groups)).toEqual({
      group_id: A_AND_S,
    })
    expect(chooseGroup(null, [])).toBeUndefined()
  })
})

describe('lessonLengths and chooseLength', () => {
  it('offers the settings’ lengths shortest first', () => {
    expect(lessonLengths([120, 60, 60])).toEqual([60, 120])
  })

  it('keeps an offered length, else takes the shortest (book §1.5 step 3)', () => {
    expect(chooseLength(120, [60, 120])).toBe(120)
    expect(chooseLength(90, [60, 120])).toBe(60)
    expect(chooseLength(null, [120])).toBe(120)
  })
})

describe('isBookableDay', () => {
  it('accepts today to the last bookable day (Sat 26 Sep to Sun 25 Oct)', () => {
    expect(isBookableDay('2026-09-26', '2026-09-26', '2026-10-25')).toBe(true)
    expect(isBookableDay('2026-10-25', '2026-09-26', '2026-10-25')).toBe(true)
    expect(isBookableDay('2026-09-25', '2026-09-26', '2026-10-25')).toBe(false)
    expect(isBookableDay('2026-10-26', '2026-09-26', '2026-10-25')).toBe(false)
  })
})

describe('dayInOtherWeek', () => {
  it('keeps the weekday (book §6.6)', () => {
    expect(dayInOtherWeek('2026-09-27', 1, '2026-09-26', '2026-10-25')).toBe('2026-10-04')
    expect(dayInOtherWeek('2026-10-06', -1, '2026-09-26', '2026-10-25')).toBe('2026-09-29')
  })

  it('takes today when the same weekday has passed', () => {
    expect(dayInOtherWeek('2026-09-29', -1, '2026-09-26', '2026-10-25')).toBe('2026-09-26')
  })

  it('never goes past the last bookable day', () => {
    expect(dayInOtherWeek('2026-10-21', 1, '2026-09-26', '2026-10-25')).toBe('2026-10-25')
  })
})

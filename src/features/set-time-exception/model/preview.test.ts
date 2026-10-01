import { describe, expect, it } from 'vitest'

import type { BookedCoachLesson, CoachDay, CoachWeek } from '@/entities/schedule'

import { blocksInside, dayOf, isOpenAlready, lessonsInside, openHoursOf } from './preview'
import { END_OF_DAY, rangeOn } from './times'

// Saturday 3 Oct as coach_week sends it (the seed): open 7:00 am–12:00 pm and 4:00–10:00 pm,
// with Aiman & Sofia at 9:00 am and Hana at 5:00 pm.

function lesson(id: string, names: string, start: string, end: string): BookedCoachLesson {
  return {
    booking_id: id,
    group_id: `group-${id}`,
    account_id: `account-${id}`,
    account_name: names,
    display_names: names,
    type_label: '1-to-1',
    size: 1,
    location: 'Palm Court',
    starts_at: start,
    ends_at: end,
    lessons: 1,
    gap_override: false,
    package_size: 4,
    unpaid: false,
    last_lesson: false,
    travel_before: 60,
    travel_after: 60,
    status: 'booked',
    used: false,
    package_no: 1,
    lesson_in_package: 1,
  }
}

const saturday: CoachDay = {
  day: '2026-10-03',
  open: [
    { starts_at: '2026-10-03T07:00:00+08:00', ends_at: '2026-10-03T12:00:00+08:00' },
    { starts_at: '2026-10-03T16:00:00+08:00', ends_at: '2026-10-03T22:00:00+08:00' },
  ],
  closed: [],
  exceptions: [],
  lessons: [
    lesson('a', 'Aiman & Sofia', '2026-10-03T09:00:00+08:00', '2026-10-03T10:00:00+08:00'),
    lesson('h', 'Hana', '2026-10-03T17:00:00+08:00', '2026-10-03T18:00:00+08:00'),
    {
      ...lesson('x', 'Kai', '2026-10-03T19:00:00+08:00', '2026-10-03T20:00:00+08:00'),
      status: 'cancelled',
      travel_before: null,
      travel_after: null,
      used: null,
      package_no: null,
      lesson_in_package: null,
    },
  ],
}

// The rest of the week is closed, so a week is Saturday among six empty days.
function weekWith(day: CoachDay): CoachWeek {
  const others = [
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-04',
  ]
  const empty = others.map((d) => ({ day: d, open: [], closed: [], exceptions: [], lessons: [] }))
  return [...empty.slice(0, 5), day, empty[5]]
}

describe('lessonsInside', () => {
  const weeks = [weekWith(saturday)]

  it('lists the booked lessons a block leaves booked (§8.3: 7:00–10:00 am)', () => {
    expect(
      lessonsInside(weeks, [rangeOn('2026-10-03', 420, 600)]).map((l) => l.booking_id),
    ).toEqual(['a'])
  })

  it('finds none outside the lessons, and never a cancelled one', () => {
    expect(lessonsInside(weeks, [rangeOn('2026-10-03', 420, 540)])).toEqual([])
    expect(lessonsInside(weeks, [rangeOn('2026-10-03', 1140, 1200)])).toEqual([])
  })

  it('covers every day of a range, in start order', () => {
    const ranges = [rangeOn('2026-10-02', 0, END_OF_DAY), rangeOn('2026-10-03', 0, END_OF_DAY)]
    expect(lessonsInside(weeks, ranges).map((l) => l.display_names)).toEqual([
      'Aiman & Sofia',
      'Hana',
    ])
  })
})

describe('Open extra time’s notes', () => {
  const blocked: CoachDay = {
    ...saturday,
    open: [
      { starts_at: '2026-10-03T09:00:00+08:00', ends_at: '2026-10-03T12:00:00+08:00' },
      { starts_at: '2026-10-03T16:00:00+08:00', ends_at: '2026-10-03T22:00:00+08:00' },
    ],
    closed: [{ starts_at: '2026-10-03T07:00:00+08:00', ends_at: '2026-10-03T09:00:00+08:00' }],
  }

  it('finds the block that extra time falls inside (§8.3: 7:30–8:30 am)', () => {
    expect(blocksInside(blocked, rangeOn('2026-10-03', 450, 510))).toEqual(blocked.closed)
    expect(blocksInside(blocked, rangeOn('2026-10-03', 600, 660))).toEqual([])
  })

  it('knows time that is open already', () => {
    expect(isOpenAlready(saturday, rangeOn('2026-10-03', 1080, 1200))).toBe(true)
    expect(isOpenAlready(saturday, rangeOn('2026-10-03', 900, 1020))).toBe(false)
  })

  it('finds its day among the loaded weeks', () => {
    expect(dayOf([weekWith(saturday)], '2026-10-03')).toBe(saturday)
    expect(dayOf([weekWith(saturday)], '2026-10-10')).toBeUndefined()
  })
})

describe('openHoursOf', () => {
  it('runs from the first window’s start to the last one’s end', () => {
    expect(openHoursOf(saturday, 30)).toEqual({ from: 420, to: 1320 })
  })

  it('widens a time between steps to whole steps', () => {
    const evening = {
      ...saturday,
      open: [{ starts_at: '2026-10-03T17:30:00+08:00', ends_at: '2026-10-03T21:30:00+08:00' }],
    }
    expect(openHoursOf(evening, 60)).toEqual({ from: 1020, to: 1320 })
  })

  it('is the whole day when the day has no open time', () => {
    expect(openHoursOf({ ...saturday, open: [] }, 30)).toEqual({ from: 0, to: END_OF_DAY })
  })

  it('ends at midnight for a window that runs to it', () => {
    const late = {
      ...saturday,
      open: [{ starts_at: '2026-10-03T20:00:00+08:00', ends_at: '2026-10-04T00:00:00+08:00' }],
    }
    expect(openHoursOf(late, 30)).toEqual({ from: 1200, to: END_OF_DAY })
  })
})

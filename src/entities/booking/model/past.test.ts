import { describe, expect, it } from 'vitest'

import {
  groupLessonState,
  historyLessonLine,
  historyPlaceLine,
  pastLessonDetail,
  pastLessonNote,
  pastStatusLabel,
} from './past'

const ME = 'a0000000-0000-4000-8000-000000000002'
const COACH = 'a0000000-0000-4000-8000-000000000001'
const position = { package_no: 2, lesson_in_package: 2, lessons: 1 }

describe('past lesson rows', () => {
  it('labels the status on the right', () => {
    expect(pastStatusLabel('done')).toBe('Done')
    expect(pastStatusLabel('cancelled')).toBe('Cancelled')
    expect(pastStatusLabel('excused')).toBe('Excused')
  })

  it('numbers a done lesson with its package', () => {
    expect(pastLessonDetail({ position }, 'Wei Jie', '1-to-1', 4)).toBe(
      'Wei Jie · 1-to-1 · Package 2, lesson 2 of 4',
    )
    expect(pastLessonDetail({ position: null }, 'Wei Jie', '1-to-1', 4)).toBe('Wei Jie · 1-to-1')
  })

  it('says who cancelled, and gives the coach’s reason', () => {
    const cancelled = {
      status: 'cancelled' as const,
      cancelled_at: '2026-09-26T04:00:00+00:00',
      cancel_reason: null,
    }
    expect(pastLessonNote({ ...cancelled, cancelled_by: ME }, ME)).toBe(
      'Cancelled by you on 26 Sep.',
    )
    expect(pastLessonNote({ ...cancelled, cancelled_by: COACH }, ME)).toBe(
      'Cancelled by your coach on 26 Sep.',
    )
    expect(
      pastLessonNote(
        { ...cancelled, cancelled_by: COACH, cancel_reason: 'Pool closed for maintenance' },
        ME,
      ),
    ).toBe('Cancelled by your coach on 26 Sep. Reason: Pool closed for maintenance')
  })

  it('explains an excused lesson, and says nothing under a done one', () => {
    const none = { cancelled_at: null, cancelled_by: null, cancel_reason: null }
    expect(pastLessonNote({ ...none, status: 'excused' }, ME)).toBe(
      'Your coach excused it, so it doesn’t count.',
    )
    expect(pastLessonNote({ ...none, status: 'done' }, ME)).toBeNull()
  })
})

describe('the coach’s History rows', () => {
  it('tells booked lessons ahead from used ones', () => {
    expect(groupLessonState({ status: 'booked', used: false })).toBe('booked')
    expect(groupLessonState({ status: 'booked', used: true })).toBe('used')
    expect(groupLessonState({ status: 'excused', used: null })).toBe('excused')
  })

  it('writes the state with the lesson numbers (coach-students spec §8)', () => {
    expect(
      historyLessonLine(
        { status: 'booked', used: false, position: { ...position, package_no: 6 } },
        4,
      ),
    ).toBe('Booked · Package 6 · lesson 2 of 4')
    expect(historyLessonLine({ status: 'booked', used: true, position }, 4)).toBe(
      'Used · Package 2 · lesson 2 of 4',
    )
    expect(
      historyLessonLine(
        {
          status: 'booked',
          used: false,
          position: { package_no: 3, lesson_in_package: 1, lessons: 2 },
        },
        4,
      ),
    ).toBe('Booked · Package 3 · lessons 1–2 of 4')
    expect(historyLessonLine({ status: 'cancelled', used: null, position: null }, 4)).toBe(
      'Cancelled',
    )
  })

  it('adds a gap override to the place', () => {
    expect(historyPlaceLine({ location: 'Palm Court', gap_override: true })).toBe(
      'Palm Court · Gap override',
    )
    expect(historyPlaceLine({ location: 'Sunrise Res.', gap_override: false })).toBe('Sunrise Res.')
  })
})

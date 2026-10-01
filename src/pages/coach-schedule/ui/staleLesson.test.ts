import { describe, expect, it } from 'vitest'

import type { CoachDay, CoachLesson, CoachWeek } from '@/entities/schedule'

import { staleLessonMessage } from './staleLesson'

// Aina's lesson, Thu 1 Oct 8:30–9:30 pm (the seed), as coach_week gives it.
const AINA = {
  booking_id: 'd0000000-0000-4000-8000-000000000011',
  starts_at: '2026-10-01T20:30:00+08:00',
}

function lesson(status: CoachLesson['status']): CoachLesson {
  const base = {
    ...AINA,
    ends_at: '2026-10-01T21:30:00+08:00',
    group_id: 'c0000000-0000-4000-8000-000000000012',
    account_id: 'a0000000-0000-4000-8000-000000000012',
    account_name: 'Aina',
    display_names: 'Aina',
    type_label: '1-to-1' as const,
    size: 1 as const,
    location: 'Maple Condo',
    lessons: 1 as const,
    gap_override: false,
    package_size: 4,
    unpaid: false,
    last_lesson: false,
  }
  return status === 'booked'
    ? {
        ...base,
        status,
        travel_before: 60,
        travel_after: 60,
        used: false,
        package_no: 1,
        lesson_in_package: 1,
      }
    : {
        ...base,
        status,
        travel_before: null,
        travel_after: null,
        used: null,
        package_no: null,
        lesson_in_package: null,
      }
}

/** The week of 28 Sep with Thursday holding `lessons`. */
function week(lessons: CoachLesson[]): CoachWeek {
  const days = ['28', '29', '30'].map((d) => `2026-09-${d}`)
  days.push('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04')
  return days.map((day): CoachDay => ({
    day,
    open: [],
    closed: [],
    exceptions: [],
    lessons: day === '2026-10-01' ? lessons : [],
  }))
}

describe('staleLessonMessage', () => {
  it('is null while the lesson is still booked', () => {
    expect(staleLessonMessage(week([lesson('booked')]), AINA)).toBeNull()
  })

  it('says it is already cancelled or excused, in the coach’s words (§5.4 not_booked)', () => {
    expect(staleLessonMessage(week([lesson('cancelled')]), AINA)).toBe(
      'This lesson is already cancelled. Refresh to see the latest.',
    )
    expect(staleLessonMessage(week([lesson('excused')]), AINA)).toBe(
      'This lesson is already excused. Refresh to see the latest.',
    )
  })

  it('gives the generic words when the lesson isn’t in its day at all', () => {
    expect(staleLessonMessage(week([]), AINA)).toBe(
      'Something went wrong. Refresh the page and try again.',
    )
  })

  it('says nothing while its week isn’t the one read (or nothing is)', () => {
    const otherWeek = week([]).map((day) => ({ ...day, day: day.day.replace('2026-', '2027-') }))
    expect(staleLessonMessage(otherWeek, AINA)).toBeNull()
    expect(staleLessonMessage(undefined, AINA)).toBeNull()
  })
})

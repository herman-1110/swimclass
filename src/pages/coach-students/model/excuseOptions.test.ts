import { describe, expect, it } from 'vitest'

import type { ExcusableLesson } from '@/entities/booking'

import { toExcuseOption } from './excuseOptions'

describe('toExcuseOption', () => {
  it('gives the excuse picker the booking id, times and place in the package', () => {
    const lesson: ExcusableLesson = {
      id: 'd0000000-0000-4000-8000-000000000005',
      group_id: 'c0000000-0000-4000-8000-000000000004',
      starts_at: '2026-09-25T11:30:00+00:00',
      ends_at: '2026-09-25T12:30:00+00:00',
      location: 'Palm Court',
      status: 'booked',
      gap_override: false,
      cancelled_at: null,
      cancelled_by: null,
      cancel_reason: null,
      position: { package_no: 2, lesson_in_package: 2, lessons: 1 },
      used: true,
    }
    expect(toExcuseOption(lesson)).toEqual({
      booking_id: 'd0000000-0000-4000-8000-000000000005',
      starts_at: '2026-09-25T11:30:00+00:00',
      ends_at: '2026-09-25T12:30:00+00:00',
      lessons: 1,
      package_no: 2,
      lesson_in_package: 2,
    })
  })
})

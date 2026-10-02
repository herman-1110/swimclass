import { describe, expect, it } from 'vitest'

import { excuseButtonLabel, excuseOption, excuseTitle, hasEnded, hasStarted } from './copy'
import type { ExcusableLesson, ExcuseCandidate } from './types'

// Wei Jie's Fri 25 Sep 7:30 pm lesson (d0…07), as coach_week sends it.
const WEI_JIE: ExcuseCandidate = {
  booking_id: 'd0000000-0000-4000-8000-000000000007',
  starts_at: '2026-09-25T19:30:00+08:00',
  ends_at: '2026-09-25T20:30:00+08:00',
  display_names: 'Wei Jie',
}

const DEMO_NOW = '2026-09-26T12:00:00+08:00'

describe('the excuse wording', () => {
  it('names the lesson by day and time', () => {
    expect(excuseTitle(WEI_JIE)).toBe('Mark Fri 25 Sep, 7:30–8:30 pm for Wei Jie as excused?')
  })

  it('names the button after the lesson picked', () => {
    expect(excuseButtonLabel(undefined)).toBe('Excuse lesson')
    expect(excuseButtonLabel({ starts_at: '2026-09-25T11:30:00+00:00' })).toBe(
      'Excuse Fri 25 Sep lesson',
    )
  })

  it('gives an option’s date, with the year when it isn’t this year’s, over its place', () => {
    const lesson = (overrides: Partial<ExcusableLesson>): ExcusableLesson => ({
      booking_id: WEI_JIE.booking_id,
      starts_at: WEI_JIE.starts_at,
      ends_at: WEI_JIE.ends_at,
      lessons: 1,
      package_no: 2,
      lesson_in_package: 2,
      ...overrides,
    })
    expect(excuseOption(lesson({}), 4, DEMO_NOW)).toEqual({
      when: 'Fri 25 Sep, 7:30–8:30 pm',
      position: 'Package 2 · lesson 2 of 4',
    })
    expect(
      excuseOption(
        lesson({ starts_at: '2025-12-12T19:30:00+08:00', ends_at: '2025-12-12T20:30:00+08:00' }),
        4,
        DEMO_NOW,
      ).when,
    ).toBe('Fri 12 Dec 2025, 7:30–8:30 pm')
    expect(
      excuseOption(lesson({ lessons: 2, package_no: 3, lesson_in_package: 1 }), 4, DEMO_NOW)
        .position,
    ).toBe('Package 3 · lessons 1–2 of 4')
    expect(
      excuseOption(lesson({ lessons: 2, package_no: 2, lesson_in_package: 4 }), 4, DEMO_NOW)
        .position,
    ).toBe('Last lesson of Package 2 and first of Package 3')
  })
})

describe('hasStarted', () => {
  it('is true from the start time, as the database’s not_started check', () => {
    expect(hasStarted(WEI_JIE, DEMO_NOW)).toBe(true)
    expect(hasStarted({ starts_at: '2026-09-26T12:00:00+08:00' }, DEMO_NOW)).toBe(true)
    expect(hasStarted({ starts_at: '2026-09-26T19:30:00+08:00' }, DEMO_NOW)).toBe(false)
  })
})

describe('hasEnded', () => {
  it('is true from the end time', () => {
    expect(hasEnded(WEI_JIE, DEMO_NOW)).toBe(true)
    expect(hasEnded({ ends_at: '2026-09-26T12:00:00+08:00' }, DEMO_NOW)).toBe(true)
    expect(hasEnded({ ends_at: '2026-09-26T12:30:00+08:00' }, DEMO_NOW)).toBe(false)
  })
})

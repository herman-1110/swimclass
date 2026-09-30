import { describe, expect, it } from 'vitest'

import { excusableLessons, EXCUSE_LIMIT, notEnded } from './lists'
import type { GroupLesson } from './types'

const NOW = '2026-09-26T12:00:00+08:00'

function lesson(id: string, startsAt: string, extra: Partial<GroupLesson> = {}): GroupLesson {
  const start = new Date(startsAt)
  return {
    id,
    group_id: 'c0000000-0000-4000-8000-000000000004',
    starts_at: startsAt,
    ends_at: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    location: 'Palm Court',
    status: 'booked',
    gap_override: false,
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: null,
    position: { package_no: 2, lesson_in_package: 1, lessons: 1 },
    used: true,
    ...extra,
  }
}

describe('notEnded', () => {
  it('drops the lessons that have ended by now', () => {
    const lessons = [
      { id: 'morning', ends_at: '2026-09-26T02:00:00+00:00' },
      { id: 'now', ends_at: '2026-09-26T04:00:00+00:00' },
      { id: 'evening', ends_at: '2026-09-26T10:00:00+00:00' },
    ]
    expect(notEnded(lessons, NOW).map((l) => l.id)).toEqual(['evening'])
  })
})

describe('excusableLessons', () => {
  it('offers booked lessons that have started, newest first', () => {
    const lessons = [
      lesson('fri-2-oct', '2026-10-02T11:30:00+00:00', { used: false }),
      lesson('fri-18-sep', '2026-09-18T11:30:00+00:00'),
      lesson('sat-noon', '2026-09-26T04:00:00+00:00', { used: false }),
      lesson('fri-25-sep', '2026-09-25T11:30:00+00:00'),
      lesson('cancelled', '2026-09-24T11:30:00+00:00', {
        status: 'cancelled',
        position: null,
        used: null,
      }),
      lesson('excused', '2026-09-23T11:30:00+00:00', {
        status: 'excused',
        position: null,
        used: null,
      }),
    ]
    expect(excusableLessons(lessons, NOW).map((l) => l.id)).toEqual([
      'sat-noon',
      'fri-25-sep',
      'fri-18-sep',
    ])
  })

  it('offers at most the latest ten', () => {
    const lessons = Array.from({ length: 12 }, (_, i) =>
      lesson(`day-${i + 1}`, `2026-09-${String(i + 1).padStart(2, '0')}T11:30:00+00:00`),
    )
    const offered = excusableLessons(lessons, NOW)
    expect(offered).toHaveLength(EXCUSE_LIMIT)
    expect(offered[0]?.id).toBe('day-12')
  })
})

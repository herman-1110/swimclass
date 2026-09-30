import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { GroupLesson } from '../model/types'
import { HistoryLessonRow } from './HistoryLessonRow'

afterEach(cleanup)

const NOW = '2026-09-26T12:00:00+08:00'

// Hana's Sat 3 Oct lesson in the coach's History (coach-students spec §8).
const booked: GroupLesson = {
  id: 'd0000000-0000-4000-8000-000000000005',
  group_id: 'c0000000-0000-4000-8000-000000000003',
  starts_at: '2026-10-03T09:00:00+00:00',
  ends_at: '2026-10-03T10:00:00+00:00',
  location: 'Sunrise Res.',
  status: 'booked',
  gap_override: false,
  cancelled_at: null,
  cancelled_by: null,
  cancel_reason: null,
  position: { package_no: 6, lesson_in_package: 2, lessons: 1 },
  used: false,
}

function renderRows(...lessons: GroupLesson[]) {
  return render(
    <ul role="list">
      {lessons.map((lesson) => (
        <HistoryLessonRow key={lesson.id} lesson={lesson} packageSize={4} now={NOW} />
      ))}
    </ul>,
  )
}

describe('HistoryLessonRow', () => {
  it('shows when, the state with the lesson numbers, and where', () => {
    renderRows(booked)
    const row = screen.getByRole('listitem')
    expect(row.textContent).toBe(
      'Sat 3 Oct, 5:00–6:00 pmBooked · Package 6 · lesson 2 of 4Sunrise Res.',
    )
  })

  it('says Used once a lesson has ended, and numbers a 2-hour lesson', () => {
    renderRows(
      {
        ...booked,
        id: 'used',
        starts_at: '2026-09-25T11:30:00+00:00',
        ends_at: '2026-09-25T12:30:00+00:00',
        position: { package_no: 2, lesson_in_package: 2, lessons: 1 },
        used: true,
      },
      {
        ...booked,
        id: 'two-hours',
        starts_at: '2026-10-04T02:00:00+00:00',
        ends_at: '2026-10-04T04:00:00+00:00',
        position: { package_no: 3, lesson_in_package: 1, lessons: 2 },
      },
    )
    expect(screen.getByText('Fri 25 Sep, 7:30–8:30 pm')).toBeTruthy()
    expect(screen.getByText('Used · Package 2 · lesson 2 of 4')).toBeTruthy()
    expect(screen.getByText('Sun 4 Oct, 10:00 am–12:00 pm')).toBeTruthy()
    expect(screen.getByText('Booked · Package 3 · lessons 1–2 of 4')).toBeTruthy()
  })

  it('shows a gap override with the place, and a cancelled lesson without numbers', () => {
    renderRows(
      { ...booked, id: 'override', location: 'Palm Court', gap_override: true },
      {
        ...booked,
        id: 'cancelled',
        status: 'cancelled',
        cancelled_at: '2026-09-26T04:00:00+00:00',
        position: null,
        used: null,
      },
    )
    const [override, cancelled] = screen.getAllByRole('listitem')
    expect(override?.textContent).toBe(
      'Sat 3 Oct, 5:00–6:00 pmBooked · Package 6 · lesson 2 of 4Palm Court · Gap override',
    )
    expect(cancelled?.textContent).toBe('Sat 3 Oct, 5:00–6:00 pmCancelledSunrise Res.')
  })

  it('adds the year to a lesson in another year', () => {
    renderRows({
      ...booked,
      starts_at: '2025-12-12T11:30:00+00:00',
      ends_at: '2025-12-12T12:30:00+00:00',
      used: true,
    })
    expect(screen.getByText('Fri 12 Dec 2025, 7:30–8:30 pm')).toBeTruthy()
  })

  it('can render as a div', () => {
    const { container } = render(<HistoryLessonRow lesson={booked} packageSize={4} as="div" />)
    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(screen.getByText('Sat 3 Oct, 5:00–6:00 pm')).toBeTruthy()
  })
})

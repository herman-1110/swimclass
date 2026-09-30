import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import type { UpcomingLesson } from '../model/types'
import { LessonRow } from './LessonRow'

afterEach(cleanup)

const NOW = '2026-09-26T12:00:00+08:00'

// meiling's upcoming lessons at DEMO_NOW (my-classes spec §8.1).
const today: UpcomingLesson = {
  id: 'd0000000-0000-4000-8000-000000000001',
  group_id: 'c0000000-0000-4000-8000-000000000001',
  starts_at: '2026-09-26T09:00:00+00:00',
  ends_at: '2026-09-26T10:00:00+00:00',
  location: 'Palm Court',
  position: { package_no: 4, lesson_in_package: 1, lessons: 1 },
}
const saturday: UpcomingLesson = {
  ...today,
  id: 'd0000000-0000-4000-8000-000000000002',
  starts_at: '2026-10-03T01:00:00+00:00',
  ends_at: '2026-10-03T02:00:00+00:00',
  position: { package_no: 4, lesson_in_package: 2, lessons: 1 },
}

const common = { names: 'Aiman & Sofia', typeLabel: '1-to-2', packageSize: 4, cutoffHours: 6 }

function renderRow(ui: ReactNode) {
  return render(<ul role="list">{ui}</ul>)
}

describe('LessonRow', () => {
  it('shows when, who, which lesson and where, with the Cancel slot and its deadline', () => {
    renderRow(
      <LessonRow
        {...common}
        lesson={saturday}
        currentPackageNo={4}
        now={NOW}
        action={(noteId) => (
          <button type="button" aria-describedby={noteId}>
            Cancel
          </button>
        )}
      />,
    )
    expect(screen.getByRole('listitem')).toBeTruthy()
    expect(screen.getByText('Sat 3 Oct, 9:00–10:00 am')).toBeTruthy()
    expect(screen.getByText('Aiman & Sofia · 1-to-2 · lesson 2 of 4')).toBeTruthy()
    expect(screen.getByText('Palm Court')).toBeTruthy()
    const note = screen.getByText('Free to cancel until 3:00 am, Sat 3 Oct.')
    expect(note.id).toBe('lesson-d0000000-0000-4000-8000-000000000002-note')
    expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-describedby')).toBe(
      note.id,
    )
    expect(screen.queryByText('Locked')).toBeNull()
  })

  it('shows Locked and the reason once the cutoff has passed, without the Cancel slot', () => {
    renderRow(
      <LessonRow
        {...common}
        lesson={today}
        now={NOW}
        action={() => <button type="button">Cancel</button>}
      />,
    )
    expect(screen.getByText('Today, 5:00–6:00 pm')).toBeTruthy()
    expect(screen.getByText('Locked')).toBeTruthy()
    expect(
      screen.getByText('Under 6 hours to go, so it can’t be cancelled and counts even if missed.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('says a lesson under way has started', () => {
    renderRow(<LessonRow {...common} lesson={today} now="2026-09-26T17:30:00+08:00" />)
    expect(screen.getByText('Locked')).toBeTruthy()
    expect(
      screen.getByText('It has started, so it can’t be cancelled and counts even if missed.'),
    ).toBeTruthy()
  })

  it('names a later package, and numbers a 2-hour lesson', () => {
    renderRow(
      <LessonRow
        {...common}
        lesson={{ ...saturday, position: { package_no: 5, lesson_in_package: 1, lessons: 2 } }}
        currentPackageNo={4}
        now={NOW}
      />,
    )
    expect(screen.getByText('Aiman & Sofia · 1-to-2 · Package 5, lessons 1–2 of 4')).toBeTruthy()
  })
})

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PastLesson } from '../model/types'
import { PastLessonRow } from './PastLessonRow'

afterEach(cleanup)

const NOW = '2026-09-26T12:00:00+08:00'
const ME = 'a0000000-0000-4000-8000-000000000004'

// weijie's past lessons at DEMO_NOW (my-classes spec §8.3).
const done: PastLesson = {
  id: 'd0000000-0000-4000-8000-000000000007',
  group_id: 'c0000000-0000-4000-8000-000000000004',
  starts_at: '2026-09-25T11:30:00+00:00',
  ends_at: '2026-09-25T12:30:00+00:00',
  location: 'Palm Court',
  status: 'done',
  cancelled_at: null,
  cancelled_by: null,
  cancel_reason: null,
  position: { package_no: 2, lesson_in_package: 2, lessons: 1 },
}

const common = { names: 'Wei Jie', typeLabel: '1-to-1', packageSize: 4, myAccountId: ME, now: NOW }

describe('PastLessonRow', () => {
  it('shows a done lesson with its package and lesson numbers', () => {
    render(
      <ul role="list">
        <PastLessonRow {...common} lesson={done} />
      </ul>,
    )
    expect(screen.getByText('Fri 25 Sep, 7:30–8:30 pm')).toBeTruthy()
    expect(screen.getByText('Wei Jie · 1-to-1 · Package 2, lesson 2 of 4')).toBeTruthy()
    expect(screen.getByText('Palm Court')).toBeTruthy()
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.getByRole('listitem').textContent).not.toContain('Cancelled')
  })

  it('shows a lesson the customer cancelled, with who and when', () => {
    render(
      <ul role="list">
        <PastLessonRow
          {...common}
          lesson={{
            ...done,
            starts_at: '2026-10-02T11:30:00+00:00',
            ends_at: '2026-10-02T12:30:00+00:00',
            status: 'cancelled',
            cancelled_at: '2026-09-26T04:00:00+00:00',
            cancelled_by: ME,
            position: null,
          }}
        />
      </ul>,
    )
    expect(screen.getByText('Wei Jie · 1-to-1')).toBeTruthy()
    expect(screen.getByText('Cancelled')).toBeTruthy()
    expect(screen.getByText('Cancelled by you on 26 Sep.')).toBeTruthy()
  })
})

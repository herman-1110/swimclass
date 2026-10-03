import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { DAY_FULLY_BOOKED_MESSAGE } from '@/shared/config/messages'

import type { CoachAway } from '../model/coachAway'
import { StartTimesSection } from './StartTimesSection'

afterEach(cleanup)

function renderSection(coachAway: CoachAway | null) {
  const element = (
    <StartTimesSection
      headingId="start-times"
      day="2026-10-03"
      weekStart="2026-09-28"
      daySlots={[]}
      failure={null}
      selected={null}
      onSelect={() => {}}
      alreadyBooked={null}
      coachAway={coachAway}
    />
  )
  render(<RouterProvider router={createMemoryRouter([{ path: '/', element }])} />)
}

describe('StartTimesSection', () => {
  it('says the coach isn’t available in place of “fully booked” on a blocked day', () => {
    renderSection({
      text: 'Your coach isn’t available on this day. Try another day.',
      wholeDay: true,
    })
    expect(
      screen.getByText('Your coach isn’t available on this day. Try another day.'),
    ).toBeTruthy()
    expect(screen.queryByText(DAY_FULLY_BOOKED_MESSAGE)).toBeNull()
  })

  it('names blocked time above “fully booked” when the rest of the day is taken', () => {
    renderSection({ text: 'Your coach isn’t available 7:00 am–12:00 pm.', wholeDay: false })
    const lines = [...document.querySelectorAll('section > p.text-ink')].map((p) => p.textContent)
    expect(lines).toEqual([
      'Your coach isn’t available 7:00 am–12:00 pm.',
      DAY_FULLY_BOOKED_MESSAGE,
    ])
  })

  it('shows only “fully booked” without blocked time', () => {
    renderSection(null)
    expect(screen.getByText(DAY_FULLY_BOOKED_MESSAGE)).toBeTruthy()
    expect(screen.queryByText(/isn’t available/)).toBeNull()
  })
})

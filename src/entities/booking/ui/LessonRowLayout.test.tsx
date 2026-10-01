import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LessonRowLayout } from '../index'

afterEach(cleanup)

// The row's layout on its own, from the front door: My classes puts features/cancel-lesson's
// Cancel button (or its "Locked") on the right and that feature's deadline note under it.
describe('LessonRowLayout', () => {
  it('lays out when, who, where, the right side and the note, with the note’s id', () => {
    render(
      <ul role="list">
        <LessonRowLayout
          when="Sat 3 Oct, 9:00–10:00 am"
          detail="Aiman & Sofia · 1-to-2 · lesson 2 of 4"
          location="Palm Court"
          aside={
            <button type="button" aria-describedby="lesson-1-note">
              Cancel
            </button>
          }
          note="Free to cancel until 3:00 am, Sat 3 Oct."
          noteId="lesson-1-note"
        />
      </ul>,
    )
    const row = screen.getByRole('listitem')
    expect(row.textContent).toBe(
      'Sat 3 Oct, 9:00–10:00 amAiman & Sofia · 1-to-2 · lesson 2 of 4Palm CourtCancel' +
        'Free to cancel until 3:00 am, Sat 3 Oct.',
    )
    const note = screen.getByText('Free to cancel until 3:00 am, Sat 3 Oct.')
    expect(note.id).toBe('lesson-1-note')
    expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-describedby')).toBe(
      note.id,
    )
  })

  it('renders as a div, and leaves the note out when there is none', () => {
    const { container } = render(
      <LessonRowLayout as="div" when="Today, 5:00–6:00 pm" detail="Sofia" location="Palm Court" />,
    )
    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.textContent).toBe('Today, 5:00–6:00 pmSofiaPalm Court')
  })
})

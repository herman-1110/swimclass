import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { EmptyState } from './EmptyState'

afterEach(cleanup)

describe('EmptyState', () => {
  it('shows the message on its own', () => {
    const { container } = render(
      <EmptyState>This day is fully booked. Try another day.</EmptyState>,
    )
    expect(screen.getByText('This day is fully booked. Try another day.').tagName).toBe('P')
    expect((container.firstElementChild as HTMLElement).className).not.toContain('border')
  })

  it('shows a title and a next step, framed when it stands in for a section', () => {
    const { container } = render(
      <EmptyState
        framed
        title="No students yet"
        action={<button type="button">Add students</button>}
      >
        Add students to create their first package.
      </EmptyState>,
    )
    expect(screen.getByText('No students yet')).toBeTruthy()
    expect(screen.getByText('Add students to create their first package.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add students' })).toBeTruthy()
    expect((container.firstElementChild as HTMLElement).className).toContain('border-frame')
  })
})

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'

afterEach(cleanup)

describe('PageHeader', () => {
  it('renders the page’s one h1, with the eyebrow above it', () => {
    render(<PageHeader size="customer" eyebrow="Hi, Mei Ling" title="Book a lesson" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Book a lesson' })
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(heading.previousElementSibling?.textContent).toBe('Hi, Mei Ling')
    expect(heading.className).toContain('leading-tight')
    // Nothing is focusable unless the page asks for it.
    expect(heading.hasAttribute('tabindex')).toBe(false)
  })

  it('shows a coach description and actions', () => {
    render(
      <PageHeader
        size="coach"
        title="Settings"
        description="The rules the booking system follows. Changes apply to new bookings."
        align="start"
        actions={<button type="button">Save changes</button>}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' }).className).toContain(
      'text-title-desktop',
    )
    expect(
      screen.getByText('The rules the booking system follows. Changes apply to new bookings.'),
    ).toBeTruthy()
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save.parentElement?.className).toContain('md:items-start')
    // Settings' header keeps 16 px between the title and the button from 768 px.
    expect(save.parentElement?.className).toContain('md:gap-4')
  })

  it('keeps 12 px between a centred coach title and its actions', () => {
    render(
      <PageHeader
        size="coach"
        title="Students & payments"
        actions={<button type="button">Add students</button>}
      />,
    )
    const row = screen.getByRole('button', { name: 'Add students' }).parentElement
    expect(row?.className).toContain('md:items-center')
    expect(row?.className).toContain('gap-3')
    expect(row?.className).not.toContain('md:gap-4')
  })

  it('gives the h1 an id to name a form by, and focuses it when asked', () => {
    render(
      <PageHeader
        size="auth"
        title="Check your email"
        description="We sent a link to meiling@example.com."
        titleId="signup-title"
        focusOnMount
      />,
    )
    const heading = screen.getByRole('heading', { level: 1, name: 'Check your email' })
    expect(heading.id).toBe('signup-title')
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(heading)
  })

  it('lets the page focus the h1 later without taking focus on mount', () => {
    render(<PageHeader size="customer" title="Book a lesson" titleId="book-title" focusable />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Book a lesson' })
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).not.toBe(heading)
    document.getElementById('book-title')?.focus()
    expect(document.activeElement).toBe(heading)
  })
})

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { BackLink } from './BackLink'

afterEach(cleanup)

function renderAt(element: ReactNode) {
  const router = createMemoryRouter([{ path: '/coach/add-students', element }], {
    initialEntries: ['/coach/add-students'],
  })
  render(<RouterProvider router={router} />)
}

describe('BackLink', () => {
  it('is a link named by where it goes, with a hidden chevron', () => {
    renderAt(<BackLink to="/coach/students">Students &amp; payments</BackLink>)
    const link = screen.getByRole('link', { name: 'Students & payments' })
    expect(link.getAttribute('href')).toBe('/coach/students')
    expect(link.hasAttribute('aria-label')).toBe(false)
    const icon = link.querySelector('svg')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('width')).toBe('16')
    expect(icon?.getAttribute('stroke-width')).toBe('1.8')
  })

  it('takes a fuller name that contains the visible text', () => {
    renderAt(
      <BackLink to="/coach/students" aria-label="Back to Students & payments">
        Students &amp; payments
      </BackLink>,
    )
    const link = screen.getByRole('link', { name: 'Back to Students & payments' })
    expect(link.textContent).toBe('Students & payments')
    expect(link.getAttribute('href')).toBe('/coach/students')
  })
})

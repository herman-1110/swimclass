import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { BackLink } from './BackLink'

afterEach(cleanup)

describe('BackLink', () => {
  it('is a link named by where it goes, with a hidden chevron', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/coach/add-students',
          element: <BackLink to="/coach/students">Students &amp; payments</BackLink>,
        },
      ],
      { initialEntries: ['/coach/add-students'] },
    )
    render(<RouterProvider router={router} />)
    const link = screen.getByRole('link', { name: 'Students & payments' })
    expect(link.getAttribute('href')).toBe('/coach/students')
    const icon = link.querySelector('svg')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('width')).toBe('16')
    expect(icon?.getAttribute('stroke-width')).toBe('1.8')
  })
})

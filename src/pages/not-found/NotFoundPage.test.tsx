import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { ROUTES } from '@/shared/config/routes'

import { NotFoundPage } from './NotFoundPage'

afterEach(cleanup)

describe('NotFoundPage', () => {
  it('says there is no page here, with a way back to the start (scenario 12)', async () => {
    const router = createMemoryRouter(
      [
        { path: ROUTES.home, element: <h1>Start</h1> },
        { path: '*', Component: NotFoundPage },
      ],
      { initialEntries: ['/nope'] },
    )
    render(<RouterProvider router={router} />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Page not found' })
    expect(heading.nextElementSibling?.textContent).toBe(
      'There’s no page at this address. Check the link, or go back to the start.',
    )
    // The layout already has the page's one <main>.
    expect(screen.queryByRole('main')).toBeNull()
    await waitFor(() => expect(document.title).toBe('Page not found · Swim Class'))

    fireEvent.click(screen.getByRole('link', { name: 'Go to the start' }))
    await screen.findByRole('heading', { name: 'Start' })
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })
})

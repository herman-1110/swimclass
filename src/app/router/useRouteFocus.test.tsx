import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Link, Navigate, Outlet, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { useRouteFocus } from './useRouteFocus'

afterEach(cleanup)

function Shell() {
  useRouteFocus()
  return (
    <>
      <nav>
        <Link to="/my-classes">My classes</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}

function renderApp(initial: string) {
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          {
            path: '/schedule',
            element: (
              <>
                <h1>Schedule</h1>
                <Link to="/book?day=2026-09-27">Book on Sun 27 Sep</Link>
                <Link to="/schedule?week=2026-09-21">See the week</Link>
              </>
            ),
          },
          { path: '/', element: <Navigate to="/book" replace /> },
          { path: '/book', element: <h1>Book a lesson</h1> },
          {
            path: '/my-classes',
            element: (
              <>
                <h1>My classes</h1>
                <button type="button">Cancel</button>
              </>
            ),
          },
        ],
      },
    ],
    { initialEntries: [initial] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('useRouteFocus', () => {
  it('leaves focus alone on the first page', async () => {
    renderApp('/schedule')
    await screen.findByRole('heading', { name: 'Schedule' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(document.body)
  })

  it('leaves focus alone through a redirect while the app loads (the skip link stays first)', async () => {
    renderApp('/')
    await screen.findByRole('heading', { name: 'Book a lesson' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(document.body)
  })

  it('focuses the new page’s h1 when the link used leaves with the old page', async () => {
    renderApp('/schedule')
    const link = await screen.findByRole('link', { name: 'Book on Sun 27 Sep' })
    link.focus()
    fireEvent.keyDown(link, { key: 'Enter' })
    fireEvent.click(link)
    const heading = await screen.findByRole('heading', { name: 'Book a lesson' })
    await waitFor(() => expect(document.activeElement).toBe(heading))
    expect(heading.getAttribute('tabindex')).toBe('-1')
  })

  it('moves focus from the nav link used to the page’s h1', async () => {
    renderApp('/schedule')
    const link = await screen.findByRole('link', { name: 'My classes' })
    link.focus()
    fireEvent.keyDown(link, { key: 'Enter' })
    fireEvent.click(link)
    const heading = await screen.findByRole('heading', { name: 'My classes' })
    await waitFor(() => expect(document.activeElement).toBe(heading))
  })

  it('does nothing when only the search part changes', async () => {
    const router = renderApp('/schedule')
    const link = await screen.findByRole('link', { name: 'See the week' })
    link.focus()
    fireEvent.keyDown(link, { key: 'Enter' })
    fireEvent.click(link)
    await waitFor(() => expect(router.state.location.search).toBe('?week=2026-09-21'))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(link)
  })
})

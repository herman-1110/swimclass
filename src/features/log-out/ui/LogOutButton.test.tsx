import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { isLogOutRequest } from '../model/logOutRequest'
import { LogOutButton } from './LogOutButton'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderButton() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.home, element: <h1>Start</h1> },
      { path: ROUTES.account, element: <LogOutButton className="log-out" /> },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
    ],
    { initialEntries: [ROUTES.home, ROUTES.account] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('LogOutButton', () => {
  it('opens Log in in place of the page, asking it to end the session', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const router = renderButton()
    const button = screen.getByRole('button', { name: 'Log out' })
    expect(button.className).toBe('log-out')
    fireEvent.click(button)
    await screen.findByRole('heading', { name: 'Welcome back' })
    expect(router.state.location.pathname).toBe(ROUTES.login)
    expect(isLogOutRequest(router.state.location.state)).toBe(true)
    // Replaced, so Back doesn't return to the signed-in page.
    expect(router.state.historyAction).toBe('REPLACE')
    // Log in ends the session (LoggingOut), not the button: a leave guard can stop it first.
    expect(await getSession()).not.toBeNull()
  })
})

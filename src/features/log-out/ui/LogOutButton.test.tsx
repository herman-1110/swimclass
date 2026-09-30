import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { LogOutButton } from './LogOutButton'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderButton() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.account, element: <LogOutButton className="log-out" /> },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
    ],
    { initialEntries: [ROUTES.account] },
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
  it('logs out and opens Log in', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const router = renderButton()
    const button = screen.getByRole('button', { name: 'Log out' })
    expect(button.className).toBe('log-out')
    fireEvent.click(button)
    await screen.findByRole('heading', { name: 'Welcome back' })
    expect(router.state.location.pathname).toBe(ROUTES.login)
    await waitFor(async () => expect(await getSession()).toBeNull())
  })
})

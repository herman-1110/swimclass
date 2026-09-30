import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { AppError } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { LoggingOut } from './LoggingOut'

// Demo mode logs out at once and never fails; these tests make it wait, or fail, when they
// need to. Otherwise it is the real one.
vi.mock('@/shared/api/auth', async (importOriginal) => {
  const auth = await importOriginal<typeof import('@/shared/api/auth')>()
  return { ...auth, logOut: vi.fn(auth.logOut) }
})

const { logOut: realLogOut } =
  await vi.importActual<typeof import('@/shared/api/auth')>('@/shared/api/auth')

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await getSession()
}, 60_000)

beforeEach(() => {
  vi.mocked(logOut).mockClear()
})

afterEach(cleanup)

/** Log in as it looks while "Log out" ends the session (RedirectIfSignedIn renders it). */
function renderLoggingOut() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.home, element: <h1>Start</h1> },
      { path: ROUTES.login, element: <LoggingOut /> },
    ],
    { initialEntries: [ROUTES.login] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    // Strict Mode runs effects twice: the session must still end only once.
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return router
}

describe('LoggingOut', () => {
  it('says "Logging out…" while the session ends, and ends it once', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    let finish = () => {}
    const held = new Promise<void>((resolve) => {
      finish = resolve
    })
    vi.mocked(logOut).mockImplementationOnce(async () => {
      await held
      await realLogOut()
    })
    renderLoggingOut()
    expect((await screen.findByRole('status')).textContent).toBe('Logging out…')
    expect(await getSession()).not.toBeNull()
    finish()
    await waitFor(async () => expect(await getSession()).toBeNull())
    expect(logOut).toHaveBeenCalledTimes(1)
  })

  it('says why it failed, and tries again', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    vi.mocked(logOut).mockRejectedValueOnce(new AppError('network'))
    renderLoggingOut()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    expect(await getSession()).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(async () => expect(await getSession()).toBeNull())
    expect(logOut).toHaveBeenCalledTimes(2)
  })

  it('lets the person give up and go back, still signed in', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    vi.mocked(logOut).mockRejectedValueOnce(new AppError('unknown'))
    const router = renderLoggingOut()
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Refresh the page and try again.',
    )
    fireEvent.click(screen.getByRole('link', { name: 'Go to the start' }))
    await screen.findByRole('heading', { name: 'Start' })
    expect(router.state.location.pathname).toBe(ROUTES.home)
    expect(await getSession()).not.toBeNull()
  })
})

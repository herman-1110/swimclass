import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionContext, useMyProfile } from '@/entities/account'
import { isLogOutRequest } from '@/features/log-out'
import { type AuthSession, getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { PendingPage } from './PendingPage'

// Runs in demo mode: the real migrations and seed in PGlite. Demo sign-up makes a
// confirmed account that waits for approval (auth spec §5.5); the seed has none.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  for (const [username, displayName] of [
    ['waiting', 'Wai Ting'],
    ['waiting.two', 'Wai Two'],
  ]) {
    await signUp({
      username,
      displayName,
      email: `${username}@example.com`,
      phone: null,
      password: DEMO_PASSWORD,
    })
  }
}, 60_000)

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await logOut()
})

/** What RequirePending reads: the profile, kept fresh by the page's polling. */
function ApprovalProbe() {
  const profile = useMyProfile()
  return <p>{profile.data?.approved ? 'Approved' : 'Not approved yet'}</p>
}

function renderPending(session: AuthSession) {
  const router = createMemoryRouter(
    [
      {
        path: ROUTES.pending,
        element: (
          <>
            <PendingPage />
            <ApprovalProbe />
          </>
        ),
      },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
    ],
    { initialEntries: [ROUTES.pending] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={{ status: 'signed-in', session }}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

describe('PendingPage', () => {
  it('says the coach must approve the account, and who is signed in (scenario 7)', async () => {
    renderPending(await logIn('waiting', DEMO_PASSWORD))
    const heading = screen.getByRole('heading', { level: 1, name: 'Waiting for approval' })
    expect(heading.nextElementSibling?.textContent).toBe(
      'Your coach needs to approve your account before you can book. You can book as soon as that’s done.',
    )
    expect(screen.getByRole('button', { name: 'Log out' }).className).toContain('text-accent')
    expect(await screen.findByText('Signed in as Wai Ting (waiting).')).toBeTruthy()
    // A waiting account may read the settings, so the title has the business name.
    await waitFor(() => expect(document.title).toBe('Waiting for approval · Swim Class'))
  })

  it('asks again every minute, so an approval shows without a reload', async () => {
    // Only the polling timer is fake; the database and Testing Library keep real time.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const session = await logIn('waiting.two', DEMO_PASSWORD)
    renderPending(session)
    await screen.findByText('Not approved yet')

    // The coach approves (as approve_account does).
    await (
      await demoDb()
    ).query('update public.profiles set approved = true where id = $1', [session.userId])
    await act(() => vi.advanceTimersByTimeAsync(59_000))
    expect(screen.getByText('Not approved yet')).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(await screen.findByText('Approved')).toBeTruthy()
  })

  it('logs out through Log in, which ends the session', async () => {
    const router = renderPending(await logIn('waiting', DEMO_PASSWORD))
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await screen.findByRole('heading', { name: 'Welcome back' })
    expect(isLogOutRequest(router.state.location.state)).toBe(true)
  })
})

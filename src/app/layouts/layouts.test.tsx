import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { createRoutes } from '@/app/router/routes'
import { logIn, logOut, signUp } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { DEMO_PASSWORD } from '@/shared/config/demo'

// The business name on each layout. This file renames the business in its own demo
// database (each test file gets a fresh one), so the other tests keep the seed's name.

const RENAMED = 'Swim Class Booking'

beforeAll(async () => {
  // jsdom has no scrolling; ScrollRestoration calls this on every navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  // Opens the demo database (about 4 s in jsdom) and reads its list of functions, which
  // the first rpc() does once, and loads the lazy modules (the demo tools bring date-fns,
  // about 3 s the first time), so no test waits for them.
  await rpc('username_available', { p_username: 'warm_up' })
  await Promise.all([import('@/pages/coach-schedule'), import('@/app/demo/DemoTools')])
  await signUp({
    username: 'newbie',
    displayName: 'New Person',
    email: 'newbie@example.com',
    phone: null,
    password: DEMO_PASSWORD,
  })
  await logIn('herman', DEMO_PASSWORD)
  await rpc('update_settings', { p_settings: { business_name: RENAMED } })
}, 60_000)

afterEach(cleanup)

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  )
}

describe('the business name', () => {
  it.each([
    ['herman', '/coach/schedule', 'Coach navigation'],
    ['meiling', '/book', 'Main navigation'],
  ])('comes from the settings in the sidebar (as %s on %s)', async (username, path, aside) => {
    await logIn(username, DEMO_PASSWORD)
    renderAt(path)
    const sidebar = await screen.findByRole('complementary', { name: aside })
    expect(await within(sidebar).findByText(RENAMED)).toBeTruthy()
  })

  it('comes from the settings on Waiting for approval', async () => {
    await logIn('newbie', DEMO_PASSWORD)
    renderAt('/pending')
    await screen.findByRole('heading', { level: 1, name: 'Waiting for approval' })
    expect(await screen.findByText(RENAMED)).toBeTruthy()
  })

  it('is the default on the signed-out pages, which can’t read the settings', async () => {
    await logOut()
    renderAt('/login')
    await screen.findByRole('heading', { level: 1, name: 'Welcome back' })
    expect(screen.getByText(DEFAULT_BUSINESS_NAME)).toBeTruthy()
    expect(screen.queryByText(RENAMED)).toBeNull()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { createRoutes } from '@/app/router/routes'
import { settingsKeys } from '@/entities/settings'
import { logIn, logOut, signUp } from '@/shared/api/auth'
import { AppError, rpc } from '@/shared/api/rpc'
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

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderAt(path: string, queryClient = newClient()) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
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

  // Auth spec §6.5: "Business name loading / failed | An empty line of the same height / 'Swim Class'".
  it('is an empty line of the same height while the settings load', async () => {
    await logIn('newbie', DEMO_PASSWORD)
    const queryClient = newClient()
    // Never fetched, so the settings stay loading.
    queryClient.setQueryDefaults(settingsKeys.public(), { enabled: false })
    renderAt('/pending', queryClient)
    await screen.findByRole('heading', { level: 1, name: 'Waiting for approval' })
    // The row above the page holds the name, then the language toggle.
    const name = screen.getByRole('main').previousElementSibling?.firstElementChild
    expect(name?.textContent).toBe('')
    expect(name?.className).toContain('min-h-[1lh]')
  })

  it('is the default when the settings fail to load', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const queryClient = newClient()
    // The settings query has failed, and nothing retries it.
    queryClient.setQueryDefaults(settingsKeys.public(), { retryOnMount: false })
    await queryClient.prefetchQuery({
      queryKey: settingsKeys.public(),
      queryFn: () => Promise.reject(new AppError('network')),
    })
    renderAt('/book', queryClient)
    const sidebar = await screen.findByRole('complementary', { name: 'Main navigation' })
    expect(await within(sidebar).findByText(DEFAULT_BUSINESS_NAME)).toBeTruthy()
    expect(within(sidebar).queryByText(RENAMED)).toBeNull()
  })
})

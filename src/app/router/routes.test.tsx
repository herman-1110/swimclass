import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, type RouteObject, RouterProvider, useBlocker } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { LOG_OUT_REQUEST } from '@/features/log-out'
import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { createRoutes } from './routes'

// Tests run in demo mode: the real migrations and seed in PGlite (src/shared/api/demo),
// signed in as a seeded account where a page needs one.

/** An account that signed up and is still waiting for the coach's approval. */
const WAITING = 'waiting'

/** Accounts whose profile row each test deletes, as if the account was deleted meanwhile. */
const GONE = ['gone.home', 'gone.book', 'gone.pending'] as const

beforeAll(async () => {
  // jsdom has no scrolling; ScrollRestoration calls this on every navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  await logOut()
  // Opens the demo database (about 4 s in jsdom) and reads its list of functions, which
  // the first rpc() does once; logOut() alone never opens it. Loads the lazy modules too
  // (the demo tools bring date-fns, about 3 s the first time). Otherwise whichever test
  // comes first waits for these, past its 1 s to find a heading.
  await rpc('username_available', { p_username: 'warm_up' })
  await Promise.all([
    import('@/pages/coach-schedule'),
    import('@/pages/coach-students'),
    import('@/pages/coach-add-students'),
    import('@/pages/coach-settings'),
    import('@/app/demo/DemoTools'),
  ])
  // Demo sign-up makes a confirmed account that waits for approval (auth spec §5.5).
  for (const username of [WAITING, ...GONE]) {
    await signUp({
      username,
      displayName: username === WAITING ? 'Wai Ting' : username,
      email: `${username}@example.com`,
      phone: null,
      password: DEMO_PASSWORD,
    })
  }
}, 60_000)

afterEach(cleanup)

/** meiling is a customer, herman the coach, WAITING not approved yet; null signs out. */
async function signIn(username: 'meiling' | 'herman' | typeof WAITING | null) {
  if (username) await logIn(username, DEMO_PASSWORD)
  else await logOut()
}

type Entry = string | { pathname: string; state: unknown }

function renderAt(entry: Entry, routes = createRoutes()) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  )
  return router
}

function findPageHeading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

/** Every route, with the coach's Settings page loaded by `lazy` instead of its own code. */
function routesWithSettings(lazy: RouteObject['lazy']): RouteObject[] {
  const routes = createRoutes()
  const findSettings = (list: RouteObject[]): RouteObject | undefined => {
    for (const route of list) {
      if (route.path === '/coach/settings') return route
      const found = route.children && findSettings(route.children)
      if (found) return found
    }
  }
  const settings = findSettings(routes)
  if (!settings) throw new Error('No settings route')
  settings.lazy = lazy
  return routes
}

// Every route (ARCHITECTURE §3.5), who opens it in the test, and the page title it shows
const pages = [
  ['/login', null, 'Welcome back'],
  ['/signup', null, 'Create an account'],
  ['/forgot-password', null, 'Forgot your password?'],
  // Signed out, the reset link has nothing to work with (auth spec §2.5)
  ['/reset-password', null, 'This link has expired'],
  ['/pending', WAITING, 'Waiting for approval'],
  ['/book', 'meiling', 'Book a lesson'],
  ['/schedule', 'meiling', 'Schedule'],
  ['/my-classes', 'meiling', 'My classes'],
  ['/account', 'meiling', 'Account'],
  ['/coach/schedule', 'herman', 'Schedule'],
  ['/coach/students', 'herman', 'Students & payments'],
  ['/coach/add-students', 'herman', 'Add students'],
  ['/coach/settings', 'herman', 'Settings'],
] as const

describe('routes', () => {
  it.each(pages)('%s (as %s) shows its page', async (path, username, heading) => {
    await signIn(username)
    const router = renderAt(path)
    await findPageHeading(heading)
    expect(router.state.location.pathname).toBe(path)
    await waitFor(() => expect(document.title).toBe(`${heading} · Swim Class`))
  })

  it.each([
    [null, '/login', 'Welcome back'],
    ['meiling', '/book', 'Book a lesson'],
    ['herman', '/coach/schedule', 'Schedule'],
    [WAITING, '/pending', 'Waiting for approval'],
  ] as const)('sends / (as %s) to %s', async (username, path, heading) => {
    await signIn(username)
    const router = renderAt('/')
    await findPageHeading(heading)
    expect(router.state.location.pathname).toBe(path)
  })

  it('sends /coach to the coach schedule', async () => {
    await signIn('herman')
    const router = renderAt('/coach')
    await findPageHeading('Schedule')
    expect(router.state.location.pathname).toBe('/coach/schedule')
  })

  it('sends a signed-out visitor to Log in', async () => {
    await signIn(null)
    const router = renderAt('/my-classes')
    await findPageHeading('Welcome back')
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state).toEqual({ from: '/my-classes' })
  })

  it('keeps customers out of the coach pages', async () => {
    await signIn('meiling')
    const router = renderAt('/coach/students')
    await findPageHeading('Book a lesson')
    expect(router.state.location.pathname).toBe('/book')
  })

  it('shows "Page not found" with a way back for unknown addresses', async () => {
    await signIn(null)
    renderAt('/no-such-page')
    await findPageHeading('Page not found')
    expect(screen.getByRole('link', { name: 'Go to the start' }).getAttribute('href')).toBe('/')
  })
})

describe('the sign-in pages, for someone already signed in', () => {
  it.each([
    ['/login', 'meiling', '/book', 'Book a lesson'],
    ['/signup', 'herman', '/coach/schedule', 'Schedule'],
    ['/forgot-password', 'meiling', '/book', 'Book a lesson'],
    ['/signup', WAITING, '/pending', 'Waiting for approval'],
  ] as const)('%s (as %s) goes home, to %s', async (path, username, home, heading) => {
    await signIn(username)
    const router = renderAt(path)
    await findPageHeading(heading)
    expect(router.state.location.pathname).toBe(home)
  })

  it('goes on to where they were going', async () => {
    await signIn('meiling')
    const router = renderAt({ pathname: '/login', state: { from: '/my-classes' } })
    await findPageHeading('My classes')
    expect(router.state.location.pathname).toBe('/my-classes')
  })

  it('never follows a remembered address off the site', async () => {
    await signIn('meiling')
    const router = renderAt({ pathname: '/login', state: { from: '//evil.example/book' } })
    await findPageHeading('Book a lesson')
    expect(router.state.location.pathname).toBe('/book')
  })

  it('carries a visitor on once they log in', async () => {
    await signIn(null)
    const router = renderAt('/my-classes')
    await findPageHeading('Welcome back')
    await act(() => logIn('meiling', DEMO_PASSWORD))
    await findPageHeading('My classes')
    expect(router.state.location.pathname).toBe('/my-classes')
  })

  it('keeps Set a new password open: the reset link signs people in', async () => {
    await signIn('meiling')
    const router = renderAt('/reset-password')
    await findPageHeading('Set a new password')
    expect(router.state.location.pathname).toBe('/reset-password')
  })
})

describe('Waiting for approval', () => {
  it.each([
    ['meiling', '/book', 'Book a lesson'],
    ['herman', '/coach/schedule', 'Schedule'],
  ] as const)('sends an approved account (%s) home, to %s', async (username, home, heading) => {
    await signIn(username)
    const router = renderAt('/pending')
    await findPageHeading(heading)
    expect(router.state.location.pathname).toBe(home)
  })

  it.each(['/book', '/account', '/coach/schedule'])(
    'is the only page a waiting account sees (%s)',
    async (path) => {
      await signIn(WAITING)
      const router = renderAt(path)
      await findPageHeading('Waiting for approval')
      expect(router.state.location.pathname).toBe('/pending')
    },
  )

  it('sends a signed-out visitor to Log in', async () => {
    await signIn(null)
    const router = renderAt('/pending')
    await findPageHeading('Welcome back')
    expect(router.state.location.state).toEqual({ from: '/pending' })
  })
})

describe('an account whose profile is gone (deleted meanwhile)', () => {
  // Auth spec §1.4, proposed change 3: logged out, not shown Waiting for approval.
  it.each([
    ['/', GONE[0]],
    ['/book', GONE[1]],
    ['/pending', GONE[2]],
  ])('is logged out and sees Log in (%s)', async (path, username) => {
    const { userId } = await logIn(username, DEMO_PASSWORD)
    // The session stays valid for a while after the account is deleted (Supabase's token).
    const db = await demoDb()
    await db.query('delete from public.profiles where id = $1', [userId])
    const router = renderAt(path)
    await findPageHeading('Welcome back')
    expect(router.state.location).toMatchObject({ pathname: '/login', state: null })
    expect(await getSession()).toBeNull()
  })
})

// Each layout has two navigations with the same name: the tab bar (below 1024 px) and the
// sidebar (from 1024 px). CSS shows one at a time; jsdom has no CSS, so tests see both.
function sidebar(name: string) {
  return screen.getByRole('complementary', { name: `${name} navigation` })
}

function sidebarNav(name: string) {
  return within(sidebar(name)).getByRole('navigation', { name })
}

function tabBar(name: string) {
  const [nav, ...others] = screen
    .getAllByRole('navigation', { name })
    .filter((element) => !element.closest('aside'))
  if (!nav || others.length > 0) throw new Error(`Expected one "${name}" tab bar`)
  return nav
}

function linkTexts(nav: HTMLElement) {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

function currentLinks(nav: HTMLElement) {
  return within(nav)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent)
}

describe('customer navigation', () => {
  beforeEach(() => signIn('meiling'))

  const tabs = [
    ['Book', '/book', 'Book a lesson'],
    ['Schedule', '/schedule', 'Schedule'],
    ['My classes', '/my-classes', 'My classes'],
    ['Account', '/account', 'Account'],
  ] as const

  it('has the four links in order in the tab bar and the sidebar, and marks the current one', async () => {
    renderAt('/schedule')
    await findPageHeading('Schedule')
    for (const nav of [tabBar('Main'), sidebarNav('Main')]) {
      expect(linkTexts(nav)).toEqual(tabs.map(([label]) => label))
      expect(currentLinks(nav)).toEqual(['Schedule'])
    }
  })

  it('says who is signed in at the bottom of the sidebar, with no way to the coach pages', async () => {
    renderAt('/book')
    await findPageHeading('Book a lesson')
    expect(await within(sidebar('Main')).findByText('Signed in as Mei Ling')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Back to coach view' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull()
  })

  it.each([
    ['tab bar', () => tabBar('Main')],
    ['sidebar', () => sidebarNav('Main')],
  ])('opens each page from the %s', async (_, getNav) => {
    const router = renderAt('/book')
    await findPageHeading('Book a lesson')
    for (const [label, path, heading] of [...tabs.slice(1), tabs[0]]) {
      fireEvent.click(within(getNav()).getByRole('link', { name: label }))
      await findPageHeading(heading)
      expect(router.state.location.pathname).toBe(path)
      expect(currentLinks(getNav())).toEqual([label])
    }
  })

  it('has a skip link to the main content', async () => {
    renderAt('/my-classes')
    await findPageHeading('My classes')
    expect(screen.getByRole('link', { name: 'Skip to main content' }).getAttribute('href')).toBe(
      '#main',
    )
    expect(screen.getByRole('main').id).toBe('main')
  })

  it('is not shown on the coach pages', async () => {
    await signIn('herman')
    renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    expect(screen.queryAllByRole('navigation', { name: 'Main' })).toHaveLength(0)
  })
})

describe('coach navigation', () => {
  beforeEach(() => signIn('herman'))

  it('has the sections in the sidebar, and shorter labels and Customer view in the tab bar', async () => {
    renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    expect(linkTexts(sidebarNav('Coach'))).toEqual(['Schedule', 'Students & payments', 'Settings'])
    expect(linkTexts(tabBar('Coach'))).toEqual([
      'Schedule',
      'Students',
      'Settings',
      'Customer view',
    ])
    expect(currentLinks(sidebarNav('Coach'))).toEqual(['Schedule'])
    expect(currentLinks(tabBar('Coach'))).toEqual(['Schedule'])
    expect(await within(sidebar('Coach')).findByText('Signed in as Herman')).toBeTruthy()
  })

  it.each([
    ['sidebar', () => sidebarNav('Coach'), 'Students & payments'],
    ['tab bar', () => tabBar('Coach'), 'Students'],
  ])('opens each coach page from the %s', async (_, getNav, studentsLabel) => {
    const router = renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    const links = [
      [studentsLabel, '/coach/students', 'Students & payments'],
      ['Settings', '/coach/settings', 'Settings'],
      ['Schedule', '/coach/schedule', 'Schedule'],
    ] as const
    for (const [label, path, heading] of links) {
      fireEvent.click(within(getNav()).getByRole('link', { name: label }))
      await findPageHeading(heading)
      expect(router.state.location.pathname).toBe(path)
      expect(currentLinks(getNav())).toEqual([label])
    }
  })

  it('keeps "Students & payments" current on Add students', async () => {
    const router = renderAt('/coach/students')
    await findPageHeading('Students & payments')
    fireEvent.click(screen.getByRole('link', { name: 'Add students' }))
    await findPageHeading('Add students')
    expect(router.state.location.pathname).toBe('/coach/add-students')
    expect(currentLinks(sidebarNav('Coach'))).toEqual(['Students & payments'])
    expect(currentLinks(tabBar('Coach'))).toEqual(['Students'])
  })

  it.each(['View as customer', 'Customer view'])(
    '"%s" opens the Book page with the customer navigation',
    async (label) => {
      const router = renderAt('/coach/schedule')
      await findPageHeading('Schedule')
      fireEvent.click(screen.getByRole('link', { name: label }))
      await findPageHeading('Book a lesson')
      expect(router.state.location.pathname).toBe('/book')
      expect(currentLinks(tabBar('Main'))).toEqual(['Book'])
    },
  )

  it('"Back to coach view" in the customer sidebar opens the coach schedule', async () => {
    const router = renderAt('/my-classes')
    await findPageHeading('My classes')
    expect(await within(sidebar('Main')).findByText('Signed in as Herman')).toBeTruthy()
    fireEvent.click(await screen.findByRole('link', { name: 'Back to coach view' }))
    await findPageHeading('Schedule')
    expect(router.state.location.pathname).toBe('/coach/schedule')
  })

  it('"Log out" in the sidebar signs the coach out and opens Log in', async () => {
    const router = renderAt('/coach/settings')
    await findPageHeading('Settings')
    fireEvent.click(within(sidebar('Coach')).getByRole('button', { name: 'Log out' }))
    await findPageHeading('Welcome back')
    // No `from` (auth spec W7): whoever logs in next starts at their own home.
    expect(router.state.location).toMatchObject({ pathname: '/login', state: null })
    expect(await getSession()).toBeNull()
  })

  it('has a skip link to the main content', async () => {
    renderAt('/coach/settings')
    await findPageHeading('Settings')
    expect(screen.getByRole('link', { name: 'Skip to main content' }).getAttribute('href')).toBe(
      '#main',
    )
    expect(screen.getByRole('main').id).toBe('main')
  })
})

describe('Log out', () => {
  /**
   * Settings with unsaved changes: its leave guard holds every navigation until the coach
   * chooses (coach Settings spec §7.4).
   */
  function UnsavedSettings() {
    const blocker = useBlocker(true)
    return (
      <>
        <h1>Settings</h1>
        {blocker.state === 'blocked' && (
          <>
            <button type="button" onClick={() => blocker.reset()}>
              Keep editing
            </button>
            <button type="button" onClick={() => blocker.proceed()}>
              Leave without saving
            </button>
          </>
        )}
      </>
    )
  }

  it('lets a page with unsaved changes keep the coach signed in, or let him go', async () => {
    await signIn('herman')
    const router = renderAt(
      '/coach/settings',
      routesWithSettings(() => Promise.resolve({ Component: UnsavedSettings })),
    )
    await findPageHeading('Settings')
    const logOutButton = () => within(sidebar('Coach')).getByRole('button', { name: 'Log out' })

    fireEvent.click(logOutButton())
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Keep editing' })).toBeNull())
    expect(router.state.location.pathname).toBe('/coach/settings')
    expect(await getSession()).not.toBeNull()

    fireEvent.click(logOutButton())
    fireEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }))
    await findPageHeading('Welcome back')
    expect(router.state.location).toMatchObject({ pathname: '/login', state: null })
    expect(await getSession()).toBeNull()
  })

  it('is not repeated once done, so logging in again keeps the new session', async () => {
    await signIn(null)
    const router = renderAt({ pathname: '/login', state: LOG_OUT_REQUEST })
    await findPageHeading('Welcome back')
    await waitFor(() => expect(router.state.location.state).toBeNull())
    await act(() => logIn('meiling', DEMO_PASSWORD))
    await findPageHeading('Book a lesson')
    expect(await getSession()).not.toBeNull()
  })
})

describe('sign-in pages', () => {
  it('link to each other', async () => {
    await signIn(null)
    const router = renderAt('/login')
    await findPageHeading('Welcome back')
    fireEvent.click(screen.getByRole('link', { name: 'New here? Create an account' }))
    await findPageHeading('Create an account')
    fireEvent.click(screen.getByRole('link', { name: 'Already have an account? Log in' }))
    await findPageHeading('Welcome back')
    fireEvent.click(screen.getByRole('link', { name: 'Forgot username or password?' }))
    await findPageHeading('Forgot your password?')
    expect(router.state.location.pathname).toBe('/forgot-password')
  })
})

describe('when a page fails to load', () => {
  // A coach page's code file can fail to download: a dropped connection, or an old file
  // name after a new release. The error screen must show, not a blank page.
  function routesWithBrokenSettings() {
    return routesWithSettings(() =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
    )
  }

  it.each([
    ['opened directly', '/coach/settings'],
    ['opened from the sidebar', '/coach/schedule'],
  ])('shows the error screen when %s', async (_, startAt) => {
    await signIn('herman')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt(startAt, routesWithBrokenSettings())
    if (startAt !== '/coach/settings') {
      await findPageHeading('Schedule')
      fireEvent.click(within(sidebarNav('Coach')).getByRole('link', { name: 'Settings' }))
    }
    await findPageHeading('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to the start' }).getAttribute('href')).toBe('/')
    expect(screen.getAllByRole('main')).toHaveLength(1)
    // RouteError logs in an effect, which may run just after the heading appears.
    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    consoleError.mockRestore()
  })
})

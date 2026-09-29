import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { createRoutes } from './routes'

// Tests run in demo mode: the real migrations and seed in PGlite (src/shared/api/demo),
// signed in as a seeded account where a page needs one.

beforeAll(async () => {
  // jsdom has no scrolling; ScrollRestoration calls this on every navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  // The first call starts the demo database.
  await logOut()
}, 60_000)

afterEach(cleanup)

/** meiling is a customer, herman the coach; null signs out. */
async function signIn(username: 'meiling' | 'herman' | null) {
  if (username) await logIn(username, DEMO_PASSWORD)
  else await logOut()
}

function renderAt(path: string, routes = createRoutes()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
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

// Every route (ARCHITECTURE §3.5), who opens it in the test, and the page title it shows
const pages = [
  ['/login', null, 'Welcome back'],
  ['/signup', null, 'Create an account'],
  ['/forgot-password', null, 'Forgot your password?'],
  ['/reset-password', null, 'Set a new password'],
  ['/pending', 'meiling', 'Waiting for approval'],
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

// Each layout has two navigations with the same name: the tab bar (below 1024 px) and the
// sidebar (from 1024 px). CSS shows one at a time; jsdom has no CSS, so tests see both.
function sidebarNav(name: string) {
  const sidebar = screen.getByRole('complementary', { name: `${name} navigation` })
  return within(sidebar).getByRole('navigation', { name })
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
    const sidebar = screen.getByRole('complementary', { name: 'Coach navigation' })
    expect(within(sidebar).getByText('Signed in as Coach')).toBeTruthy()
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

  it('has a skip link to the main content', async () => {
    renderAt('/coach/settings')
    await findPageHeading('Settings')
    expect(screen.getByRole('link', { name: 'Skip to main content' }).getAttribute('href')).toBe(
      '#main',
    )
    expect(screen.getByRole('main').id).toBe('main')
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
    settings.lazy = () =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module'))
    return routes
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
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

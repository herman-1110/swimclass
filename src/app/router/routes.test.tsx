import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createRoutes } from './routes'

beforeAll(() => {
  // jsdom has no scrolling; ScrollRestoration calls this on every navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(cleanup)

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

function findPageHeading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

// Every route (ARCHITECTURE §3.5) and the page title it shows
const pages = [
  ['/login', 'Welcome back'],
  ['/signup', 'Create an account'],
  ['/forgot-password', 'Forgot your password?'],
  ['/reset-password', 'Set a new password'],
  ['/pending', 'Waiting for approval'],
  ['/book', 'Book a lesson'],
  ['/schedule', 'Schedule'],
  ['/my-classes', 'My classes'],
  ['/account', 'Account'],
  ['/coach/schedule', 'Schedule'],
  ['/coach/students', 'Students & payments'],
  ['/coach/add-students', 'Add students'],
  ['/coach/settings', 'Settings'],
] as const

describe('routes', () => {
  it.each(pages)('%s shows its placeholder page', async (path, heading) => {
    const router = renderAt(path)
    await findPageHeading(heading)
    expect(router.state.location.pathname).toBe(path)
    await waitFor(() => expect(document.title).toBe(`${heading} · Swim Class`))
  })

  it('sends / to the Book page for now', async () => {
    const router = renderAt('/')
    await findPageHeading('Book a lesson')
    expect(router.state.location.pathname).toBe('/book')
  })

  it('sends /coach to the coach schedule', async () => {
    const router = renderAt('/coach')
    await findPageHeading('Schedule')
    expect(router.state.location.pathname).toBe('/coach/schedule')
  })

  it('shows "Page not found" with a way back for unknown addresses', async () => {
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
    renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    expect(screen.queryAllByRole('navigation', { name: 'Main' })).toHaveLength(0)
  })
})

describe('coach navigation', () => {
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createMemoryRouter(routesWithBrokenSettings(), { initialEntries: [startAt] })
    render(<RouterProvider router={router} />)
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

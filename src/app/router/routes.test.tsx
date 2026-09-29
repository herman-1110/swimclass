// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
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

// Every route in TECH_SPEC §11 and the page title it shows
const pages = [
  ['/login', 'Welcome back'],
  ['/signup', 'Create an account'],
  ['/forgot', 'Forgot your password?'],
  ['/reset', 'Set a new password'],
  ['/pending', 'Waiting for approval'],
  ['/book', 'Book a lesson'],
  ['/schedule', 'Schedule'],
  ['/classes', 'My classes'],
  ['/account', 'Account'],
  ['/coach/schedule', 'Schedule'],
  ['/coach/students', 'Students & payments'],
  ['/coach/students/new', 'Add students'],
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

describe('customer tab bar', () => {
  const tabs = [
    ['Book', '/book', 'Book a lesson'],
    ['Schedule', '/schedule', 'Schedule'],
    ['My classes', '/classes', 'My classes'],
    ['Account', '/account', 'Account'],
  ] as const

  it('has the four tabs in order and marks the current one', async () => {
    renderAt('/book')
    await findPageHeading('Book a lesson')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(tabs.map(([label]) => label))
    expect(within(nav).getByRole('link', { name: 'Book' }).getAttribute('aria-current')).toBe(
      'page',
    )
  })

  it('opens each page from its tab', async () => {
    const router = renderAt('/book')
    await findPageHeading('Book a lesson')
    for (const [label, path, heading] of [...tabs.slice(1), tabs[0]]) {
      const nav = screen.getByRole('navigation', { name: 'Main' })
      fireEvent.click(within(nav).getByRole('link', { name: label }))
      await findPageHeading(heading)
      expect(router.state.location.pathname).toBe(path)
      expect(
        within(screen.getByRole('navigation', { name: 'Main' }))
          .getByRole('link', { name: label })
          .getAttribute('aria-current'),
      ).toBe('page')
    }
  })

  it('is not shown on the coach pages', async () => {
    renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()
  })
})

describe('coach sidebar', () => {
  it('opens each coach page from its link', async () => {
    const router = renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    const links = [
      ['Students & payments', '/coach/students', 'Students & payments'],
      ['Settings', '/coach/settings', 'Settings'],
      ['Schedule', '/coach/schedule', 'Schedule'],
    ] as const
    for (const [label, path, heading] of links) {
      const nav = screen.getByRole('navigation', { name: 'Coach' })
      fireEvent.click(within(nav).getByRole('link', { name: label }))
      await findPageHeading(heading)
      expect(router.state.location.pathname).toBe(path)
      expect(
        within(screen.getByRole('navigation', { name: 'Coach' }))
          .getByRole('link', { name: label })
          .getAttribute('aria-current'),
      ).toBe('page')
    }
  })

  it('keeps "Students & payments" current on Add students', async () => {
    const router = renderAt('/coach/students')
    await findPageHeading('Students & payments')
    fireEvent.click(screen.getByRole('link', { name: 'Add students' }))
    await findPageHeading('Add students')
    expect(router.state.location.pathname).toBe('/coach/students/new')
    const nav = screen.getByRole('navigation', { name: 'Coach' })
    expect(
      within(nav).getByRole('link', { name: 'Students & payments' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('"View as customer" opens the Book page with the tab bar', async () => {
    const router = renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    fireEvent.click(screen.getByRole('link', { name: 'View as customer' }))
    await findPageHeading('Book a lesson')
    expect(router.state.location.pathname).toBe('/book')
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy()
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
    expect(router.state.location.pathname).toBe('/forgot')
  })
})

describe('when a page fails to load', () => {
  // A coach page's code file can fail to download: a dropped connection, or an old file
  // name after a new release. The error screen must show, not a blank page.
  function routesWithBrokenSettings() {
    const routes = createRoutes()
    const findSettings = (list: RouteObject[]): RouteObject | undefined => {
      for (const route of list) {
        if (route.path === 'settings') return route
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
      const nav = screen.getByRole('navigation', { name: 'Coach' })
      fireEvent.click(within(nav).getByRole('link', { name: 'Settings' }))
    }
    await findPageHeading('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to the start' }).getAttribute('href')).toBe('/')
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { createRoutes } from '@/app/router/routes'
import { SessionContext, type SessionState } from '@/entities/account'
import { logIn } from '@/shared/api/auth'
import { resetDemoData } from '@/shared/api/backend'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { DemoTools } from './DemoTools'

vi.mock('@/shared/api/backend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/backend')>()),
  // The real one deletes the demo database and reloads the page, which jsdom can't do.
  resetDemoData: vi.fn(() => Promise.resolve()),
}))

beforeAll(async () => {
  // jsdom has no scrolling; ScrollRestoration calls this on every navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  // Opens the demo database (about 4 s in jsdom) and reads its list of functions, which
  // the first rpc() does once, and loads the lazy coach page, so no test waits for them.
  await rpc('username_available', { p_username: 'warm_up' })
  await import('@/pages/coach-schedule')
}, 60_000)

afterEach(cleanup)

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

/** The whole app at `path` (the tools come with RootLayout in demo mode). */
function renderAt(path: string) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] })
  render(
    <QueryClientProvider client={client()}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  )
  return router
}

/** The tools alone, with the session in a given state. */
function renderTools(session: SessionState) {
  const router = createMemoryRouter([{ path: '/', element: <DemoTools /> }])
  render(
    <QueryClientProvider client={client()}>
      <SessionContext value={session}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
}

async function openPanel() {
  fireEvent.click(await screen.findByRole('button', { name: 'Demo' }))
  return screen.getByRole('dialog', { name: 'Demo' })
}

function findPageHeading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

describe('the Demo button', () => {
  it('says the demo is starting until the first session check answers', () => {
    renderTools({ status: 'loading' })
    expect(screen.getByRole('status').textContent).toBe('Starting the demo…')
    cleanup()
    renderTools({ status: 'signed-out' })
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Demo' })).toBeTruthy()
  })

  it('opens a panel that says what demo mode is, and Esc or Close shuts it', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderAt('/book')
    await findPageHeading('Book a lesson')
    const button = await screen.findByRole('button', { name: 'Demo' })
    expect(button.getAttribute('aria-expanded')).toBe('false')

    let panel = await openPanel()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(
      within(panel).getByText(
        'Demo mode · sample data · clock stopped at Sat 26 Sep 2026, 12:00 pm',
      ),
    ).toBeTruthy()
    fireEvent.keyDown(panel, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Demo' })).toBeNull())
    expect(document.activeElement).toBe(button)

    panel = await openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Demo' })).toBeNull())
    expect(document.activeElement).toBe(button)
  })

  it('shows the starting state in the panel too', () => {
    renderTools({ status: 'loading' })
    fireEvent.click(screen.getByRole('button', { name: 'Demo' }))
    const panel = screen.getByRole('dialog', { name: 'Demo' })
    const starting = within(panel).getByText('Starting the demo…')
    expect(starting.getAttribute('role')).toBe('status')
    expect(within(panel).queryByText(/^Demo mode/)).toBeNull()
  })
})

describe('Sign in as', () => {
  it('lists every account, the coach first, and marks who is signed in', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderAt('/book')
    await findPageHeading('Book a lesson')
    const accounts = within(await openPanel()).getByRole('region', { name: 'Sign in as' })
    const buttons = await within(accounts).findAllByRole('button')
    expect(buttons).toHaveLength(13)
    expect(buttons[0]?.textContent).toBe('Herman herman · coach')
    const signedIn = within(accounts).getByRole('button', { name: 'Mei Ling meiling · signed in' })
    expect(signedIn).toBeTruthy()
  })

  it('signs in as the account chosen and goes home', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const router = renderAt('/my-classes')
    await findPageHeading('My classes')
    const accounts = within(await openPanel()).getByRole('region', { name: 'Sign in as' })
    fireEvent.click(await within(accounts).findByRole('button', { name: /^Herman / }))
    await findPageHeading('Schedule')
    expect(router.state.location.pathname).toBe('/coach/schedule')
    expect(screen.queryByRole('dialog', { name: 'Demo' })).toBeNull()
    expect(await screen.findByText('Signed in as Herman')).toBeTruthy()
  })
})

describe('Sent emails', () => {
  async function messageAllCustomers(message: string) {
    await rpc('post_announcement', { p_message: message, p_pinned: false, p_send_email: true })
  }

  it('lists what the site would have sent, newest first, and opens one to read it', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderAt('/coach/schedule')
    await findPageHeading('Schedule')

    let mailbox = within(await openPanel()).getByRole('region', { name: 'Sent emails' })
    expect(await within(mailbox).findByText('No emails sent yet.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    // One email to each of the 12 approved customers; the panel reads again as it opens.
    await messageAllCustomers('The pool is closed on Saturday.')
    mailbox = within(await openPanel()).getByRole('region', { name: 'Sent emails' })
    const emails = await within(mailbox).findAllByRole('button', { expanded: false })
    expect(emails).toHaveLength(12)
    const first = emails[0]
    if (!first) throw new Error('No email')
    expect(first.textContent).toMatch(/^To \S+@example\.com \w{3} \d+ \w{3}, \d+:\d{2} [ap]m /)
    expect(first.textContent).toContain('Message from your coach')

    fireEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
    const body = document.getElementById(first.getAttribute('aria-controls') ?? '')
    expect(body?.textContent).toContain('The pool is closed on Saturday.')
    expect(body?.textContent).not.toContain('{{site_url}}')
  })

  it('puts the newest email first', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await messageAllCustomers('Lessons move to the small pool next week.')
    renderAt('/coach/schedule')
    await findPageHeading('Schedule')
    const mailbox = within(await openPanel()).getByRole('region', { name: 'Sent emails' })
    const emails = await within(mailbox).findAllByRole('button', { expanded: false })
    expect(emails).toHaveLength(24)
    const first = emails[0]
    if (!first) throw new Error('No email')
    fireEvent.click(first)
    const body = document.getElementById(first.getAttribute('aria-controls') ?? '')
    expect(body?.textContent).toContain('Lessons move to the small pool next week.')
  })
})

describe('Reset demo data', () => {
  it('puts the sample data back', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderAt('/book')
    await findPageHeading('Book a lesson')
    fireEvent.click(within(await openPanel()).getByRole('button', { name: 'Reset demo data' }))
    await waitFor(() => expect(resetDemoData).toHaveBeenCalledTimes(1))
  })
})

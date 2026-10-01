import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { GENERIC_MESSAGE } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'

import { BookPage } from './BookPage'

// Book's error states (book §6.3) in demo mode. Each test breaks the demo database on
// purpose (a hidden view, an account no longer approved) and mends it before it ends.

const SLOW = { timeout: 5000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function renderBook(path: string = ROUTES.book) {
  const session = await logIn('meiling', DEMO_PASSWORD)
  const router = createMemoryRouter([{ path: ROUTES.book, Component: BookPage }], {
    initialEntries: [path],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={{ status: 'signed-in', session }}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
}

describe('BookPage when a read fails', () => {
  it('says what went wrong under the heading, and "Try again" reads it again', async () => {
    const db = await demoDb()
    // Read the view once first: the demo backend keeps its columns, so while it is hidden the
    // read fails in Postgres itself, as a real failure would, and works again once it's back.
    await logIn('meiling', DEMO_PASSWORD)
    await readRows('group_details', { limit: 1 })
    await db.query('alter view public.group_details rename to group_details_hidden')
    try {
      await renderBook()
      expect(await screen.findByRole('alert', {}, SLOW)).toHaveProperty(
        'textContent',
        GENERIC_MESSAGE,
      )
      expect(screen.getByRole('heading', { level: 1, name: 'Book a lesson' })).toBeTruthy()
      expect(screen.queryByRole('radio')).toBeNull()
    } finally {
      await db.query('alter view public.group_details_hidden rename to group_details')
    }
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { name: 'Start time · Sun 27 Sep' }, SLOW),
    ).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  }, 20_000)

  it('shows a start-times failure in place of the chips, with no dots on the days', async () => {
    const db = await demoDb()
    await db.query("update public.profiles set approved = false where username = 'meiling'")
    try {
      await renderBook('/book?day=2026-09-29')
      const alert = await screen.findByRole('alert', {}, SLOW)
      expect(alert.textContent).toBe('Your coach hasn’t approved your account yet.')
      const days = within(screen.getByRole('group', { name: 'Day' })).getAllByRole('button')
      expect(days.map((day) => day.getAttribute('aria-label'))).toEqual([
        'Mon 28 Sep',
        'Tue 29 Sep',
        'Wed 30 Sep',
        'Thu 1 Oct',
        'Fri 2 Oct',
        'Sat 3 Oct',
        'Sun 4 Oct',
      ])
      expect(screen.queryByRole('button', { name: /, available$/ })).toBeNull()
    } finally {
      await db.query("update public.profiles set approved = true where username = 'meiling'")
    }
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(
      () => expect(screen.getAllByRole('button', { name: /, available$/ })).toHaveLength(4),
      SLOW,
    )
    expect(screen.getByRole('button', { name: 'Tue 29 Sep, 4 free start times' })).toBeTruthy()
  }, 20_000)
})

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
      const alert = await screen.findByRole('alert', {}, SLOW)
      expect(alert.textContent).toBe(GENERIC_MESSAGE)
      expect(screen.getByRole('heading', { level: 1, name: 'Book a lesson' })).toBeTruthy()
      expect(screen.queryByRole('radio')).toBeNull()
      // As every screen shows a failed read: the kit Banner, "Try again" quiet in accent.
      const banner = alert.closest('.bg-subtle')
      expect(banner).not.toBeNull()
      const button = within(banner as HTMLElement).getByRole('button', { name: 'Try again' })
      expect(button.className).toContain('text-accent')
    } finally {
      await db.query('alter view public.group_details_hidden rename to group_details')
    }
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    // "Try again" goes while the reads run again; focus waits on the page's title.
    const title = screen.getByRole('heading', { level: 1, name: 'Book a lesson' })
    expect(document.activeElement).toBe(title)
    expect(
      await screen.findByRole('heading', { name: 'Start time · Sun 27 Sep' }, SLOW),
    ).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(title)
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
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    // Focus waits on the start times' heading while they load again.
    const heading = screen.getByRole('heading', { name: 'Start time · Tue 29 Sep' })
    expect(document.activeElement).toBe(heading)
    await waitFor(
      () => expect(screen.getAllByRole('button', { name: /, available$/ })).toHaveLength(4),
      SLOW,
    )
    expect(screen.getByRole('button', { name: 'Tue 29 Sep, 4 free start times' })).toBeTruthy()
    expect(document.activeElement).toBe(heading)
  }, 20_000)

  it('keeps the screen, and shows the booking, when the balances fail to refresh after it', async () => {
    const db = await demoDb()
    await renderBook('/book?day=2026-10-08&length=60&time=19:30')
    await screen.findByRole('heading', { name: 'Start time · Thu 8 Oct' }, SLOW)
    await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
    // book_lesson reads the balance with its own rights; the customer's own read now fails.
    await db.query('revoke select on public.group_balance from authenticated')
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
      const summary = within(screen.getByRole('region', { name: 'Booking summary' }))
      expect(
        await summary.findByRole('heading', { name: 'Booked 7:30 pm for Aiman & Sofia' }, SLOW),
      ).toBeTruthy()
      // The refresh has run: the start times have the new lesson, the balance read failed.
      expect(
        await screen.findByRole('button', { name: '7:30 pm, not available' }, SLOW),
      ).toBeTruthy()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByText('1-to-2 · Package 4')).toBeTruthy()
      // The package line waits for a balance that never came.
      expect(summary.queryByText(/^Package \d/)).toBeNull()
    } finally {
      await db.query('grant select on public.group_balance to authenticated')
    }
  }, 20_000)
})

describe('BookPage when book_lesson refuses a start the refresh takes away', () => {
  it('still explains the refusal when the coach has closed that time (outside_open_hours)', async () => {
    const db = await demoDb()
    await renderBook('/book?day=2026-10-06&length=60&time=19:30')
    await screen.findByRole('heading', { name: 'Start time · Tue 6 Oct' }, SLOW)
    await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
    // The coach blocks 7:00–9:00 pm after the chips loaded.
    const [{ id }] = (
      await db.query<{ id: string }>(
        `insert into public.availability_exceptions (kind, starts_at, ends_at)
         values ('closed', '2026-10-06T19:00:00+08:00', '2026-10-06T21:00:00+08:00') returning id`,
      )
    ).rows
    try {
      const summary = within(screen.getByRole('region', { name: 'Booking summary' }))
      const book = summary.getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' })
      book.focus()
      fireEvent.click(book)
      expect(await summary.findByText('7:30 pm isn’t available', {}, SLOW)).toBeTruthy()
      expect(summary.getByText('Your coach isn’t available at that time.')).toBeTruthy()
      // The refreshed chips no longer have 7:30 pm; the summary still says why.
      await waitFor(
        () => expect(screen.queryByRole('button', { name: /^7:30 pm,/ })).toBeNull(),
        SLOW,
      )
      expect(summary.getByText('7:30 pm isn’t available')).toBeTruthy()
      expect(book.textContent).toBe('Pick a free time')
      expect(book.getAttribute('aria-disabled')).toBe('true')
      expect(document.activeElement).toBe(book)
    } finally {
      await db.query('delete from public.availability_exceptions where id = $1', [id])
    }
  }, 20_000)

  it('still explains the refusal when the coach has dropped that length (invalid_length)', async () => {
    const db = await demoDb()
    await renderBook('/book?day=2026-10-07&length=120&time=19:30')
    await screen.findByRole('heading', { name: 'Start time · Wed 7 Oct' }, SLOW)
    await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
    await db.query(`update public.settings set lesson_lengths = '{60}' where id = 1`)
    try {
      const summary = within(screen.getByRole('region', { name: 'Booking summary' }))
      fireEvent.click(summary.getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
      expect(await summary.findByText('7:30 pm isn’t available', {}, SLOW)).toBeTruthy()
      expect(summary.getByText(GENERIC_MESSAGE)).toBeTruthy()
      // The refreshed settings offer 1 hour only; the summary doesn't quietly offer it.
      await waitFor(() => expect(screen.queryByRole('radio', { name: '2 hours' })).toBeNull(), SLOW)
      await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
      expect(summary.getByText('7:30 pm isn’t available')).toBeTruthy()
      expect(summary.getByText(GENERIC_MESSAGE)).toBeTruthy()
      expect(
        summary.getByRole('button', { name: 'Pick a free time' }).getAttribute('aria-disabled'),
      ).toBe('true')
    } finally {
      await db.query(`update public.settings set lesson_lengths = '{60,120}' where id = 1`)
    }
  }, 20_000)
})

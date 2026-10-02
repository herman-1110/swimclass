import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { BookPage } from './BookPage'

// book.md §8.4: the other seeded accounts at Sat 26 Sep 2026 12:00 MYT (demo mode). Nothing
// here books, so the seed stays as it is for every test.

const SLOW = { timeout: 5000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function renderBook(username: string, path: string) {
  const session = await logIn(username, DEMO_PASSWORD)
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
  await screen.findByRole('heading', { name: /^Start time · / }, SLOW)
  await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
}

const summary = () => within(screen.getByRole('region', { name: 'Booking summary' }))

describe('BookPage for the other seeded accounts (book §8.4)', () => {
  it('farah: Hana’s package is unpaid, and two weeks can be booked', async () => {
    await renderBook('farah', '/book?day=2026-09-29&time=19:30')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Hana 1-to-1' }).checked).toBe(true)
    expect(screen.getByText('1-to-1 · Package 6')).toBeTruthy()
    expect(screen.getByText('Unpaid').className).toContain('text-warn')
    expect(screen.getByText('0 used · 2 booked · 2 left to book')).toBeTruthy()
    expect(
      summary().getByRole('checkbox', { name: 'Repeat weekly: also book Tue 6 Oct' }),
    ).toBeTruthy()
  })

  it('farah: Sat 3 Oct names Hana’s lesson', async () => {
    await renderBook('farah', '/book?day=2026-10-03')
    expect(
      await screen.findByText('Already booked this day: Hana, 5:00–6:00 pm', {}, SLOW),
    ).toBeTruthy()
  })

  it('weijie: one lesson of credit, so no repeat, and 2 hours asks to pay first', async () => {
    await renderBook('weijie', '/book?day=2026-09-29&time=19:30')
    expect(screen.getByText('1-to-1 · Package 2')).toBeTruthy()
    expect(screen.getByText('Unpaid')).toBeTruthy()
    expect(screen.getByText('2 used · 1 booked · 1 left to book')).toBeTruthy()
    expect(summary().getByRole('button', { name: 'Book 7:30 pm for Wei Jie' })).toBeTruthy()
    expect(summary().queryByRole('checkbox')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: '2 hours' }))
    await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
    fireEvent.click(screen.getByRole('button', { name: '7:30 pm, available' }))
    const box = summary()
    expect(
      await box.findByText('Pay for the current package before booking more lessons.'),
    ).toBeTruthy()
    expect(
      box
        .getByRole('button', { name: 'Pay for the current package first' })
        .getAttribute('aria-disabled'),
    ).toBe('true')
  })

  it('priya: a fully booked package names the next one to pay for', async () => {
    await renderBook('priya', '/book?day=2026-09-29&time=19:30')
    expect(screen.getByText('1-to-1 · Package 4')).toBeTruthy()
    expect(screen.getByText('Paid')).toBeTruthy()
    expect(screen.getByText('2 used · 2 booked · fully booked')).toBeTruthy()
    expect(
      screen.getByText('New bookings start Package 5. Pay for it before or at its first lesson.'),
    ).toBeTruthy()
    expect(summary().getByRole('checkbox', { name: 'Repeat weekly for 4 weeks' })).toBeTruthy()
    expect(
      await screen.findByText('Already booked this day: Priya, 5:30–6:30 pm', {}, SLOW),
    ).toBeTruthy()
  })

  it('zulaikha: the button names all three students', async () => {
    await renderBook('zulaikha', '/book?day=2026-09-29&time=19:30')
    expect(screen.getByRole('radio', { name: 'Adam, Alya & Amir 1-to-3' })).toBeTruthy()
    expect(screen.getByText('1-to-3 · Package 1')).toBeTruthy()
    expect(
      summary().getByRole('button', { name: 'Book 7:30 pm for Adam, Alya & Amir' }),
    ).toBeTruthy()
  })

  it('nurul: a 2-hour lesson with one lesson left spans two packages (C18)', async () => {
    // After her lesson on Sun 4 Oct: lessons 4 and 5, and 4 are paid (opening balance).
    await renderBook('nurul', '/book?day=2026-10-06&length=120&time=19:30')
    expect(
      await summary().findByText(
        '1-to-1 for Nurul · uses 2 lessons: the last of Package 1 and the first of Package 2, not paid yet',
        {},
        SLOW,
      ),
    ).toBeTruthy()
  })

  it('nurul: before her Sun 4 Oct lesson, 2 hours complete Package 1 and move that one on', async () => {
    // The ledger numbers lessons by start time: Tue 29 Sep takes lessons 3 and 4, and
    // Sun 4 Oct becomes Package 2's first, which isn't paid.
    await renderBook('nurul', '/book?day=2026-09-29&length=120&time=19:30')
    expect(
      await summary().findByText(
        '1-to-1 for Nurul · uses 2 lessons from Package 1, completes the package · Package 2 isn’t paid yet',
        {},
        SLOW,
      ),
    ).toBeTruthy()
  })

  it('every account opens on Sun 27 Sep with 20 free starts', async () => {
    await renderBook('ethan', ROUTES.book)
    expect(screen.getByRole('heading', { name: 'Start time · Sun 27 Sep' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /, available$/ })).toHaveLength(20)
  })
})

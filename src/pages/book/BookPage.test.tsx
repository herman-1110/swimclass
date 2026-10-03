import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { holdDemoDatabase } from '@/shared/api/demo/testing'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { NO_GROUPS_COACH_MESSAGE } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'

import { BookPage } from './BookPage'

// Runs in demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00
// MYT. The expectations are book.md §8's walkthrough. One database for the whole file:
// the tests that book come last.

const A_AND_S = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const SLOW = { timeout: 5000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** The page alone on its route, signed in as a seeded account (pages may not import app/). */
async function renderBook(username: string, path: string = ROUTES.book) {
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
  return { router, queryClient }
}

const summary = () => within(screen.getByRole('region', { name: 'Booking summary' }))
/** Waits for the day's start times to be in: its heading, then no "Loading start times…". */
async function startTimes(day: string) {
  const heading = await screen.findByRole('heading', { name: `Start time · ${day}` }, SLOW)
  await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
  return heading
}
const chipNames = () =>
  screen
    .getAllByRole('button', { name: /, (not )?available$/ })
    .map(
      (chip) =>
        `${chip.getAttribute('aria-label')}${chip.getAttribute('aria-pressed') === 'true' ? ' *' : ''}`,
    )
const dayLabels = () =>
  within(screen.getByRole('group', { name: 'Day' }))
    .getAllByRole('button')
    .map((day) => day.getAttribute('aria-label'))

describe('BookPage', () => {
  it('shows the heading at once and the screen’s skeleton while it loads', async () => {
    await renderBook('meiling')
    expect(screen.getByRole('heading', { level: 1, name: 'Book a lesson' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Loading…')
    expect(summary().getByRole('button', { name: 'Pick a time' })).toBeTruthy()
    await startTimes('Sun 27 Sep')
    await waitFor(() => expect(document.title).toBe('Book a lesson · Swim Class'))
  })

  it('opens on Sun 27 Sep with every one of its 20 starts free (book §8.1)', async () => {
    const { router } = await renderBook('meiling')
    await startTimes('Sun 27 Sep')
    expect(screen.getByText('Hi, Mei Ling')).toBeTruthy()
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Aiman & Sofia 1-to-2' }).checked,
    ).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Sofia 1-to-1' }).checked).toBe(
      false,
    )
    expect(screen.getByText('1-to-2 · Package 4')).toBeTruthy()
    expect(screen.getByText('Paid')).toBeTruthy()
    expect(screen.getByText('0 used · 2 booked · 2 left to book')).toBeTruthy()
    expect(dayLabels()).toEqual([
      'Mon 21 Sep, past',
      'Tue 22 Sep, past',
      'Wed 23 Sep, past',
      'Thu 24 Sep, past',
      'Fri 25 Sep, past',
      'Sat 26 Sep, fully booked',
      'Sun 27 Sep, 20 free start times',
    ])
    const sunday = screen.getByRole('button', { name: 'Sun 27 Sep, 20 free start times' })
    expect(sunday.getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Mon 21 Sep, past' }).disabled,
    ).toBe(true)
    const week = within(screen.getByRole('group', { name: 'Week' }))
    expect(week.getByText('21–27 Sep')).toBeTruthy()
    expect(week.getByRole('button', { name: 'Previous week' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    expect(week.getByRole('button', { name: 'Next week' }).getAttribute('aria-disabled')).toBeNull()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '1 hour' }).checked).toBe(true)
    expect(chipNames()).toHaveLength(20)
    expect(chipNames().every((name) => name.endsWith(', available'))).toBe(true)
    expect(screen.queryByText(/^Already booked this day/)).toBeNull()
    expect(summary().getByText('Pick a start time')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See the week' }).getAttribute('href')).toBe(
      '/schedule?week=2026-09-21',
    )
    // The opening choice stays out of the address until something changes (book §1.4).
    expect(router.state.location.search).toBe('')
  })

  it('opens the drawing’s state from the address: Tue 29 Sep with 7:30 pm picked (book §8.3)', async () => {
    await renderBook('meiling', '/book?day=2026-09-29&length=60&time=19:30')
    await startTimes('Tue 29 Sep')
    expect(chipNames()).toEqual([
      '5:30 pm, not available',
      '6:00 pm, not available',
      '6:30 pm, not available',
      '7:00 pm, not available',
      '7:30 pm, available *',
      '8:00 pm, available',
      '8:30 pm, available',
      '9:00 pm, available',
    ])
    expect(dayLabels()).toEqual([
      'Mon 28 Sep, 1 free start time',
      'Tue 29 Sep, 4 free start times',
      'Wed 30 Sep, 3 free start times',
      'Thu 1 Oct, fully booked',
      'Fri 2 Oct, 1 free start time',
      'Sat 3 Oct, 6 free start times',
      'Sun 4 Oct, 1 free start time',
    ])
    const box = summary()
    expect(box.getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
    expect(
      box.getByText(
        '1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this',
      ),
    ).toBeTruthy()
    expect(box.getByRole('checkbox', { name: 'Repeat weekly for 4 weeks' })).toBeTruthy()
    expect(box.getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' })).toBeTruthy()
    expect(box.getByText('Free to cancel or reschedule up to 6 hours before.')).toBeTruthy()
  })

  it('explains a crossed-out time when it is tapped, and keeps it in the address', async () => {
    const { router } = await renderBook('meiling', '/book?day=2026-09-29')
    await startTimes('Tue 29 Sep')
    fireEvent.click(screen.getByRole('button', { name: '7:00 pm, not available' }))
    const box = summary()
    expect(await box.findByText('7:00 pm isn’t available')).toBeTruthy()
    expect(
      box.getByText(
        'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
      ),
    ).toBeTruthy()
    expect(
      box.getByRole('button', { name: 'Pick a free time' }).getAttribute('aria-disabled'),
    ).toBe('true')
    expect(router.state.location.search).toBe(
      `?group=${A_AND_S}&day=2026-09-29&length=60&time=19:00`,
    )
  })

  it('shows 2-hour starts, and Thu 1 Oct as fully booked (prompt 06 VALIDATION)', async () => {
    const { router } = await renderBook('meiling', '/book?day=2026-09-29&time=19:30')
    await startTimes('Tue 29 Sep')
    fireEvent.click(screen.getByRole('radio', { name: '2 hours' }))
    await waitFor(() =>
      expect(chipNames().filter((name) => name.endsWith(', available'))).toEqual([
        '7:30 pm, available',
        '8:00 pm, available',
      ]),
    )
    // A new length forgets the picked time (book §6.6).
    expect(router.state.location.search).toBe(`?group=${A_AND_S}&day=2026-09-29&length=120`)
    expect(summary().getByText('Pick a start time')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Thu 1 Oct, fully booked' }))
    expect(await screen.findByText('This day is fully booked. Try another day.')).toBeTruthy()
    expect(chipNames().some((name) => name.endsWith(', available'))).toBe(false)
  })

  it('shows Sofia’s package and what a lesson for her uses, keeping the picked time', async () => {
    const { router } = await renderBook('meiling', '/book?day=2026-09-29&length=60&time=19:30')
    await startTimes('Tue 29 Sep')
    fireEvent.click(screen.getByRole('radio', { name: 'Sofia 1-to-1' }))
    expect(await screen.findByText('1-to-1 · Package 2')).toBeTruthy()
    expect(screen.getByText('3 used · 1 booked · fully booked')).toBeTruthy()
    expect(
      screen.getByText('New bookings start Package 3. Pay for it before or at its first lesson.'),
    ).toBeTruthy()
    const box = summary()
    // Tue 29 Sep comes before her lesson on Sun 4 Oct (lesson 4 of Package 2, the last paid):
    // the ledger gives Tue 29 Sep that place and moves Sun 4 Oct on to Package 3, unpaid.
    expect(
      await box.findByText(
        '1-to-1 for Sofia · uses 1 lesson from Package 2 · Package 3 isn’t paid yet',
        {},
        SLOW,
      ),
    ).toBeTruthy()
    expect(box.getByRole('button', { name: 'Book 7:30 pm for Sofia' })).toBeTruthy()
    expect(router.state.location.search).toBe(`?group=${SOFIA}&day=2026-09-29&length=60&time=19:30`)
  })

  it('goes straight to the new group’s lesson while its start times load (§6.6)', async () => {
    const { queryClient } = await renderBook('meiling', '/book?day=2026-09-29&length=60&time=19:30')
    await startTimes('Tue 29 Sep')
    // Every read of the screen is in (the account's upcoming lessons too).
    await waitFor(() => expect(queryClient.isFetching()).toBe(0), SLOW)
    const release = await holdDemoDatabase()
    try {
      fireEvent.click(screen.getByRole('radio', { name: 'Sofia 1-to-1' }))
      // Only the chips wait; the summary keeps the picked time with Sofia's package.
      expect(await screen.findByText('Loading start times…')).toBeTruthy()
      const box = summary()
      expect(box.getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
      expect(
        box.getByText('1-to-1 for Sofia · uses 1 lesson from Package 2 · Package 3 isn’t paid yet'),
      ).toBeTruthy()
      expect(box.getByRole('button', { name: 'Book 7:30 pm for Sofia' })).toBeTruthy()
    } finally {
      await release()
    }
    await startTimes('Tue 29 Sep')
    expect(chipNames()).toContain('7:30 pm, available *')
  })

  it('moves a week on to the same weekday and names the account’s own lesson there', async () => {
    const { router } = await renderBook('meiling')
    await startTimes('Sun 27 Sep')
    // The account's own lessons (week_busy) answer 150 ms after the start times, as two
    // separate requests may. The "Already booked" line must come with the chips, never
    // after them: it would push them down (book §6.1). Every state Sun 4 Oct passes
    // through is watched.
    const backend = await getBackend()
    const rpc = backend.rpc.bind(backend)
    vi.spyOn(backend, 'rpc').mockImplementation(async (fn, args) => {
      if (fn === 'week_busy') await new Promise((resolve) => setTimeout(resolve, 150))
      return rpc(fn, args)
    })
    const shown: string[] = []
    const watch = new MutationObserver(() => {
      const section = screen
        .queryByRole('heading', { name: 'Start time · Sun 4 Oct' })
        ?.closest('section')
      if (!section) return
      const chips = section.querySelectorAll('button[aria-pressed]').length > 0
      const line = section.textContent?.includes('Already booked this day') ?? false
      if (chips) shown.push(line ? 'chips with the line' : 'chips alone')
    })
    watch.observe(document.body, { subtree: true, childList: true, characterData: true })
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await startTimes('Sun 4 Oct')
    watch.disconnect()
    expect(shown).not.toContain('chips alone')
    const alreadyBooked = screen.getByText('Already booked this day: Sofia, 5:00–6:00 pm')
    // It names groups: a one-word name of up to 100 characters breaks inside (book §6.6).
    expect(alreadyBooked.className).toContain('wrap-anywhere')
    expect(chipNames().filter((name) => name.endsWith(', available'))).toEqual([
      '9:00 pm, available',
    ])
    expect(router.state.location.search).toBe(`?group=${A_AND_S}&day=2026-10-04&length=60`)
    const week = within(screen.getByRole('group', { name: 'Week' }))
    expect(week.getByText('28 Sep – 4 Oct')).toBeTruthy()
    expect(
      week.getByRole('button', { name: 'Previous week' }).getAttribute('aria-disabled'),
    ).toBeNull()
  })

  it('stops the weeks at the end of the booking window (book §1.6)', async () => {
    await renderBook('meiling', '/book?day=2026-10-25')
    await startTimes('Sun 25 Oct')
    const week = within(screen.getByRole('group', { name: 'Week' }))
    expect(week.getByText('19–25 Oct')).toBeTruthy()
    expect(week.getByRole('button', { name: 'Next week' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
  })

  it('ignores what the address asks for when it can’t be used', async () => {
    await renderBook('meiling', '/book?group=nope&day=2026-10-26&length=90&time=25:00')
    await startTimes('Sun 27 Sep')
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Aiman & Sofia 1-to-2' }).checked,
    ).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '1 hour' }).checked).toBe(true)
    expect(summary().getByText('Pick a start time')).toBeTruthy()
  })

  it('explains a shared link to a time that has been taken (book §1.4)', async () => {
    await renderBook('meiling', '/book?day=2026-09-26&time=17:00')
    await startTimes('Sat 26 Sep')
    expect(screen.getByText('This day is fully booked. Try another day.')).toBeTruthy()
    expect(
      await screen.findByText('Already booked this day: Aiman & Sofia, 5:00–6:00 pm'),
    ).toBeTruthy()
    const box = summary()
    expect(box.getByText('5:00 pm isn’t available')).toBeTruthy()
    expect(box.getByText('It overlaps Aiman & Sofia’s lesson at 5:00–6:00 pm.')).toBeTruthy()
  })

  it('refuses a weekly booking that clashes in a later week, booking nothing', async () => {
    await renderBook('meiling', '/book?day=2026-09-27&time=17:00')
    await startTimes('Sun 27 Sep')
    const box = summary()
    fireEvent.click(box.getByRole('checkbox', { name: 'Repeat weekly for 5 weeks' }))
    fireEvent.click(box.getByRole('button', { name: 'Book 5:00 pm for Aiman & Sofia' }))
    expect(
      await box.findByText(
        'These weeks clash: Sun 4 Oct. Nothing was booked. Try another time or turn off repeat.',
        {},
        SLOW,
      ),
    ).toBeTruthy()
    expect(screen.getByText('0 used · 2 booked · 2 left to book')).toBeTruthy()

    // Another start dismisses the refusal, and picking 5:00 pm again doesn't bring it back.
    fireEvent.click(screen.getByRole('button', { name: '5:30 pm, available' }))
    expect(await box.findByText('Sun 27 Sep · 5:30–6:30 pm')).toBeTruthy()
    expect(box.queryByText(/^These weeks clash/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '5:00 pm, available' }))
    expect(await box.findByText('Sun 27 Sep · 5:00–6:00 pm')).toBeTruthy()
    expect(
      box.getByText(
        '1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this',
      ),
    ).toBeTruthy()
    expect(box.queryByText(/^These weeks clash/)).toBeNull()
  })

  it('books 7:30 pm for Aiman & Sofia, then shows it booked everywhere (book §8.3)', async () => {
    const { router } = await renderBook('meiling', '/book?day=2026-09-29&length=60&time=19:30')
    await startTimes('Tue 29 Sep')
    fireEvent.click(summary().getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
    const heading = await screen.findByRole(
      'heading',
      { name: 'Booked 7:30 pm for Aiman & Sofia' },
      SLOW,
    )
    expect(document.activeElement).toBe(heading)
    expect(summary().getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
    expect(router.state.location.search).toBe(`?group=${A_AND_S}&day=2026-09-29&length=60`)
    // The refreshed package, start times and own lessons (book §5.3.1).
    expect(
      await summary().findByText('Package 4 · 0 used · 3 booked · 1 left to book', {}, SLOW),
    ).toBeTruthy()
    expect(screen.getByText('0 used · 3 booked · 1 left to book')).toBeTruthy()
    expect(
      await screen.findByText('Already booked this day: Aiman & Sofia, 7:30–8:30 pm'),
    ).toBeTruthy()
    expect(screen.getByText('This day is fully booked. Try another day.')).toBeTruthy()

    // The booked time is now crossed out, with the account's own lesson as the reason.
    fireEvent.click(screen.getByRole('button', { name: '7:30 pm, not available' }))
    expect(
      await summary().findByText('It overlaps Aiman & Sofia’s lesson at 7:30–8:30 pm.'),
    ).toBeTruthy()
    expect(summary().queryByRole('heading')).toBeNull()
  })

  it('goes back to the start times from "Book another lesson"', async () => {
    await renderBook('meiling', '/book?day=2026-10-06&length=60&time=19:30')
    const heading = await startTimes('Tue 6 Oct')
    fireEvent.click(summary().getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
    await screen.findByRole('heading', { name: 'Booked 7:30 pm for Aiman & Sofia' }, SLOW)
    fireEvent.click(await summary().findByRole('button', { name: 'Book another lesson' }))
    expect(summary().getByText('Pick a start time')).toBeTruthy()
    expect(document.activeElement).toBe(heading)
  })

  it('dismisses the success panel for good: going back doesn’t bring it, or its focus, back', async () => {
    await renderBook('meiling', '/book?day=2026-10-13&length=60&time=19:30')
    await startTimes('Tue 13 Oct')
    fireEvent.click(summary().getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
    await screen.findByRole('heading', { name: 'Booked 7:30 pm for Aiman & Sofia' }, SLOW)

    // 2 hours, then 1 hour again: the plain summary, and focus stays on the length.
    fireEvent.click(screen.getByRole('radio', { name: '2 hours' }))
    await waitFor(() => expect(summary().queryByRole('heading')).toBeNull())
    const oneHour = screen.getByRole('radio', { name: '1 hour' })
    oneHour.focus()
    fireEvent.click(oneHour)
    await startTimes('Tue 13 Oct')
    expect(summary().getByText('Pick a start time')).toBeTruthy()
    expect(summary().queryByRole('heading')).toBeNull()
    expect(document.activeElement).toBe(oneHour)

    // Wed 14 Oct, then Tue 13 Oct again: the same.
    fireEvent.click(screen.getByRole('button', { name: /^Wed 14 Oct/ }))
    await startTimes('Wed 14 Oct')
    const tuesday = screen.getByRole('button', { name: /^Tue 13 Oct/ })
    tuesday.focus()
    fireEvent.click(tuesday)
    await startTimes('Tue 13 Oct')
    expect(summary().getByText('Pick a start time')).toBeTruthy()
    expect(summary().queryByRole('heading')).toBeNull()
    expect(document.activeElement).toBe(tuesday)
  })

  it('names the group booked when another group is chosen while it books', async () => {
    await renderBook('meiling', '/book?day=2026-10-15&length=60&time=19:30')
    await startTimes('Thu 15 Oct')
    const release = await holdDemoDatabase()
    try {
      fireEvent.click(summary().getByRole('button', { name: 'Book 7:30 pm for Aiman & Sofia' }))
      expect(await summary().findByRole('button', { name: 'Booking…' })).toBeTruthy()
      fireEvent.click(screen.getByRole('radio', { name: 'Sofia 1-to-1' }))
      expect(await screen.findByText('1-to-1 · Package 2')).toBeTruthy()
    } finally {
      await release()
    }
    expect(
      await summary().findByRole('heading', { name: 'Booked 7:30 pm for Aiman & Sofia' }, SLOW),
    ).toBeTruthy()
    expect(summary().getByText('Thu 15 Oct · 7:30–8:30 pm')).toBeTruthy()
    // Sofia's package is on screen, so the panel leaves the booked group's package out.
    await waitFor(() => expect(screen.queryByText('Loading start times…')).toBeNull(), SLOW)
    expect(summary().queryByText(/^Package \d/)).toBeNull()
  })
})

describe('BookPage for the coach', () => {
  it('shows herman the empty state and reads no start times (book §6.2)', async () => {
    const { queryClient } = await renderBook('herman')
    // In his own words, not the customer's "Message your coach" (triage 11).
    const message = await screen.findByText(NO_GROUPS_COACH_MESSAGE, {}, SLOW)
    // In a card, as My classes shows it (ui-kit §3.23: it replaces whole sections).
    expect(message.closest('.rounded-frame.border-frame')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Book a lesson' })).toBeTruthy()
    expect(screen.getByText('Hi, Herman')).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Booking summary' })).toBeNull()
    expect(queryClient.getQueryCache().findAll({ queryKey: ['slot'] })).toEqual([])
  })
})

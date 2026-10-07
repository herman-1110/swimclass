import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SessionContext } from '@/entities/account'
import { type AuthSession, getSession, logIn, logOut } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { NETWORK_MESSAGE } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'

import { MyClassesPage } from './MyClassesPage'

// Demo mode: the real migrations and seed in PGlite, the clock at Sat 26 Sep 2026 12:00 MYT,
// cancel_cutoff_hours 6, no package prices and no payment instructions (my-classes §8).

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * Stands between the page and the demo database's reads of `sources` (tables and views):
 * at first they fail as if the server were out of reach; after hold() they wait for
 * release(), and then go through.
 */
async function guardReads(sources: readonly string[]) {
  const backend = await getBackend()
  const answer = backend.read.bind(backend)
  let failing = true
  let release = () => {}
  let released = Promise.resolve()
  vi.spyOn(backend, 'read').mockImplementation(async (source, query) => {
    if (sources.includes(source)) {
      if (failing) throw new TypeError('Failed to fetch')
      await released
    }
    return answer(source, query)
  })
  return {
    hold() {
      failing = false
      released = new Promise((resolve) => {
        release = resolve
      })
    },
    release: () => release(),
  }
}

const heading = (name: string) => screen.getByRole('heading', { level: 2, name })

/** The page alone on its route, for this session (pages may not import app/: no guards). */
function renderPage(session: AuthSession) {
  const router = createMemoryRouter([{ path: ROUTES.myClasses, Component: MyClassesPage }], {
    initialEntries: [ROUTES.myClasses],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={{ status: 'signed-in', session }}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

/** The page, signed in as a seeded account. */
async function renderAs(username: string) {
  return renderPage(await logIn(username, DEMO_PASSWORD))
}

const section = (name: string) => screen.getByRole('region', { name })

/** A section's rows as text, once they are in. */
async function rowsOf(name: string) {
  await waitFor(() => expect(section(name).getAttribute('aria-busy')).toBeNull())
  return within(section(name))
    .queryAllByRole('listitem')
    .map((row) => row.textContent)
}

const NOTE_LOCKED = 'Under 6 hours to go, so it can’t be cancelled and counts even if missed.'

describe('MyClassesPage', () => {
  it('shows meiling’s lessons and packages as drawn', async () => {
    await renderAs('meiling')
    // The title needs no data; the sections say they are loading.
    expect(screen.getByRole('heading', { level: 1, name: 'My classes' })).toBeTruthy()
    expect(section('Upcoming').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Loading your lessons…')).toBeTruthy()
    expect(screen.getByText('Loading your packages…')).toBeTruthy()

    expect(await rowsOf('Upcoming')).toEqual([
      `Today, 5:00–6:00 pmAiman & Sofia · 1-to-2 · lesson 1 of 4Palm CourtLocked${NOTE_LOCKED}`,
      'Sat 3 Oct, 9:00–10:00 amAiman & Sofia · 1-to-2 · lesson 2 of 4Palm CourtCancel' +
        'Free to cancel until 3:00 am, Sat 3 Oct.',
      'Sun 4 Oct, 5:00–6:00 pmSofia · 1-to-1 · lesson 4 of 4Palm CourtCancel' +
        'Free to cancel until 11:00 am, Sun 4 Oct.',
    ])
    expect(await screen.findByText('Mei Ling’s account · Aiman & Sofia')).toBeTruthy()
    const [today] = within(section('Upcoming')).getAllByRole('listitem')
    expect(within(today).queryByRole('button')).toBeNull()

    // Cancel names its lesson and reads out its deadline.
    const saturday = screen.getByRole('button', {
      name: 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia',
    })
    const note = document.getElementById(saturday.getAttribute('aria-describedby') ?? '')
    expect(note?.textContent).toBe('Free to cancel until 3:00 am, Sat 3 Oct.')
    expect(saturday.getAttribute('aria-haspopup')).toBe('dialog')
    expect(
      screen.getByRole('button', { name: 'Cancel Sun 4 Oct, 5:00–6:00 pm for Sofia' }),
    ).toBeTruthy()

    expect(await rowsOf('Packages')).toEqual([
      'Aiman & Sofia1-to-2Paid 19 Sep · FPXPackage 4 · 0 used · 2 booked · 2 left to book',
      'Sofia1-to-1Paid 29 Aug · TransferPackage 2 · 3 used · 1 booked · fully booked' +
        'After 4 Oct, Sofia’s next 1-to-1 lesson starts Package 3. Pay before or at its first lesson.',
    ])
    expect(screen.queryByText('How to pay:')).toBeNull()
    expect(screen.queryByText('Unpaid')).toBeNull()
    await waitFor(() => expect(document.title).toBe('My classes · Swim Class'))

    const past = screen.getByRole('button', { name: 'Past lessons and receipts' })
    expect(past.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById(past.getAttribute('aria-controls') ?? '')?.hidden).toBe(true)
  })

  it('opens meiling’s past lessons and receipts in place', async () => {
    await renderAs('meiling')
    const past = await screen.findByRole('button', { name: 'Past lessons and receipts' })
    fireEvent.click(past)
    expect(past.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(past.getAttribute('aria-controls') ?? '')?.hidden).toBe(false)
    // All her used lessons are from her starting balance, not bookings.
    expect(await rowsOf('Past and cancelled lessons')).toEqual([])
    expect(
      within(section('Past and cancelled lessons')).getByText('No past or cancelled lessons yet.'),
    ).toBeTruthy()
    expect(await rowsOf('Payments')).toEqual([
      '19 Sep 2026Aiman & Sofia · 1-to-2 · 4 lessonsFPXRM 400',
      '29 Aug 2026Sofia · 1-to-1 · 4 lessonsTransferRM 240',
    ])
    fireEvent.click(past)
    expect(past.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('region', { name: 'Payments' })).toBeNull()
  })

  it('shows farah’s unpaid package, whose first unpaid lesson is still ahead', async () => {
    await renderAs('farah')
    expect(await rowsOf('Upcoming')).toEqual([
      'Today, 7:30–8:30 pmHana · 1-to-1 · lesson 1 of 4Sunrise Res.Cancel' +
        'Free to cancel until 1:30 pm, Sat 26 Sep.',
      'Sat 3 Oct, 5:00–6:00 pmHana · 1-to-1 · lesson 2 of 4Sunrise Res.Cancel' +
        'Free to cancel until 11:00 am, Sat 3 Oct.',
    ])
    expect(await screen.findByText('Farah’s account · Hana')).toBeTruthy()
    expect(await rowsOf('Packages')).toEqual([
      'Hana1-to-1Package 6 unpaidPackage 6 · 0 used · 2 booked · 2 left to book' +
        'Package 6 isn’t paid yet. Pay before or at its first lesson.',
    ])
  })

  it('shows weijie’s unpaid package and his past lessons', async () => {
    await renderAs('weijie')
    expect(await rowsOf('Upcoming')).toEqual([
      'Fri 2 Oct, 7:30–8:30 pmWei Jie · 1-to-1 · lesson 3 of 4Palm CourtCancel' +
        'Free to cancel until 1:30 pm, Fri 2 Oct.',
    ])
    expect(await rowsOf('Packages')).toEqual([
      'Wei Jie1-to-1Package 2 unpaidPackage 2 · 2 used · 1 booked · 1 left to book' +
        'Package 2 isn’t paid yet. Pay your coach as soon as you can.',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Past lessons and receipts' }))
    expect(await rowsOf('Past and cancelled lessons')).toEqual([
      'Fri 25 Sep, 7:30–8:30 pmWei Jie · 1-to-1 · Package 2, lesson 2 of 4Palm CourtDone',
      'Fri 18 Sep, 7:30–8:30 pmWei Jie · 1-to-1 · Package 2, lesson 1 of 4Palm CourtDone',
    ])
    expect(await rowsOf('Payments')).toEqual(['16 Aug 2026Wei Jie · 1-to-1 · 4 lessonsFPXRM 240'])
  })

  it.each([
    [
      'grace',
      'Grace’s account · Chloe',
      'Sun 4 Oct, 10:00 am–12:00 pmChloe · 1-to-1 · lessons 1–2 of 4Vista HeightsCancel' +
        'Free to cancel until 4:00 am, Sun 4 Oct.',
      'Chloe1-to-1Paid 20 Sep · FPXPackage 3 · 0 used · 2 booked · 2 left to book',
    ],
    [
      'zulaikha',
      'Zulaikha’s account · Adam, Alya & Amir',
      'Sat 3 Oct, 11:00 am–12:00 pmAdam, Alya & Amir · 1-to-3 · lesson 2 of 4Maple CondoCancel' +
        'Free to cancel until 5:00 am, Sat 3 Oct.',
      'Adam, Alya & Amir1-to-3Paid 18 Sep · CashPackage 1 · 1 used · 1 booked · 2 left to book',
    ],
    [
      'nurul',
      'Nurul’s account · Nurul',
      'Sun 4 Oct, 7:00–8:00 pmNurul · 1-to-1 · lesson 3 of 4Seri MayaCancel' +
        'Free to cancel until 1:00 pm, Sun 4 Oct.',
      // A starting balance and no payment yet: nothing beside the names.
      'Nurul1-to-1Package 1 · 2 used · 1 booked · 1 left to book',
    ],
  ])('shows %s’s lessons and package', async (username, head, lesson, block) => {
    await renderAs(username)
    expect(await rowsOf('Upcoming')).toEqual([lesson])
    expect(await rowsOf('Packages')).toEqual([block])
    expect(await screen.findByText(head)).toBeTruthy()
  })

  it('says what went wrong in each section, and Try again reads it again', async () => {
    // The page thinks meiling is signed in, but the database answers as nobody, so its reads
    // fail (settings refuse anyone signed out).
    const session = await logIn('meiling', DEMO_PASSWORD)
    await logOut()
    renderPage(session)
    const generic = 'Something went wrong. Refresh the page and try again.'
    await waitFor(() =>
      expect(within(section('Upcoming')).getByRole('alert').textContent).toBe(generic),
    )
    await waitFor(() =>
      expect(within(section('Packages')).getByRole('alert').textContent).toBe(generic),
    )
    expect(section('Upcoming').getAttribute('aria-busy')).toBeNull()
    expect(screen.queryByText('Loading your lessons…')).toBeNull()
    // As every screen shows a failed read: the kit Banner, "Try again" quiet in accent.
    const banner = within(section('Upcoming')).getByRole('alert').closest('.bg-subtle')
    expect(banner).not.toBeNull()
    expect(
      within(banner as HTMLElement).getByRole('button', { name: 'Try again' }).className,
    ).toContain('text-accent')

    // The name couldn't be read either: the line under the title is left out, not loading.
    expect(screen.getByRole('heading', { level: 1 }).previousElementSibling).toBeNull()

    // Signed in again: Try again brings the lessons, and focus goes on to their heading.
    await logIn('meiling', DEMO_PASSWORD)
    const retry = within(section('Upcoming')).getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() =>
      expect(within(section('Upcoming')).getAllByRole('listitem')).toHaveLength(3),
    )
    expect(within(section('Upcoming')).queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(heading('Upcoming'))
  })

  it('keeps the lessons while Packages is read again, and Try again brings the packages', async () => {
    const balances = await guardReads(['group_balance'])
    await renderAs('meiling')
    // The balances couldn't be read: Packages says so, and the lessons show without them.
    await waitFor(() =>
      expect(within(section('Packages')).getByRole('alert').textContent).toBe(NETWORK_MESSAGE),
    )
    expect(await rowsOf('Upcoming')).toHaveLength(3)

    // While they are read again, Try again stays, busy, with focus, and the lessons stay.
    balances.hold()
    const retry = within(section('Packages')).getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(retry)
    expect(within(section('Packages')).getByRole('alert').textContent).toBe(NETWORK_MESSAGE)
    expect(section('Upcoming').getAttribute('aria-busy')).toBeNull()
    expect(within(section('Upcoming')).getAllByRole('listitem')).toHaveLength(3)
    expect(within(section('Upcoming')).getAllByRole('button', { name: /^Cancel / })).toHaveLength(2)

    balances.release()
    await waitFor(() =>
      expect(within(section('Packages')).getAllByRole('listitem')).toHaveLength(2),
    )
    expect(within(section('Packages')).queryByRole('alert')).toBeNull()
    expect(document.activeElement).toBe(heading('Packages'))
  })

  it('says when the past can’t be read, and Try again brings each list', async () => {
    await renderAs('weijie')
    await rowsOf('Upcoming')
    const reads = await guardReads(['bookings', 'payments'])
    fireEvent.click(screen.getByRole('button', { name: 'Past lessons and receipts' }))
    await waitFor(() =>
      expect(within(section('Past and cancelled lessons')).getByRole('alert').textContent).toBe(
        NETWORK_MESSAGE,
      ),
    )
    await waitFor(() =>
      expect(within(section('Payments')).getByRole('alert').textContent).toBe(NETWORK_MESSAGE),
    )
    expect(section('Past and cancelled lessons').getAttribute('aria-busy')).toBeNull()

    reads.hold()
    const lessonsRetry = within(section('Past and cancelled lessons')).getByRole('button', {
      name: 'Try again',
    })
    lessonsRetry.focus()
    fireEvent.click(lessonsRetry)
    await waitFor(() => expect(lessonsRetry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(lessonsRetry)
    reads.release()
    await waitFor(() =>
      expect(within(section('Past and cancelled lessons')).getAllByRole('listitem')).toHaveLength(
        2,
      ),
    )
    expect(document.activeElement).toBe(heading('Past and cancelled lessons'))

    const paymentsRetry = within(section('Payments')).getByRole('button', { name: 'Try again' })
    paymentsRetry.focus()
    fireEvent.click(paymentsRetry)
    const payment = await within(section('Payments')).findByRole('listitem')
    expect(payment.textContent).toBe('16 Aug 2026Wei Jie · 1-to-1 · 4 lessonsFPXRM 240')
    expect(document.activeElement).toBe(heading('Payments'))
  })

  it('shows the coach, looking as a customer, that he has no lessons of his own', async () => {
    await renderAs('herman')
    expect(
      await screen.findByText(
        'Customers see their lessons here. Your coach account has no lessons of its own.',
      ),
    ).toBeTruthy()
    expect(await screen.findByText('Herman’s account')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Upcoming' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Packages' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Past lessons and receipts' })).toBeNull()
  })

  it('keeps a lesson when the confirmation is closed, and returns focus to its Cancel', async () => {
    await renderAs('meiling')
    await rowsOf('Upcoming')
    const cancel = screen.getByRole('button', {
      name: 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia',
    })
    cancel.focus()
    fireEvent.click(cancel)
    const dialog = screen.getByRole('alertdialog', {
      name: 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?',
    })
    expect(within(dialog).getByText('The lesson goes back to your package.')).toBeTruthy()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Keep lesson' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep lesson' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(document.activeElement).toBe(cancel)
    expect(await rowsOf('Upcoming')).toHaveLength(3)
  })

  // Writes to the demo database: keep it last.
  it('cancels a lesson, says so, and shows the lists without it', async () => {
    await renderAs('meiling')
    await rowsOf('Upcoming')
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia' }),
    )
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel lesson' }))

    const notice = await screen.findByRole('status')
    expect(notice.textContent).toBe(
      'Lesson cancelled: Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia. It went back to your package.',
    )
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(notice))

    await waitFor(() =>
      expect(within(section('Upcoming')).getAllByRole('listitem')).toHaveLength(2),
    )
    expect(
      await within(section('Packages')).findByText(
        'Package 4 · 0 used · 1 booked · 3 left to book',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Past lessons and receipts' }))
    expect(await rowsOf('Past and cancelled lessons')).toEqual([
      'Sat 3 Oct, 9:00–10:00 amAiman & Sofia · 1-to-2Palm CourtCancelled' +
        'Cancelled by you on 26 Sep.',
    ])
    // The notice stays until the page is left.
    expect(screen.getByText(/^Lesson cancelled: Sat 3 Oct/)).toBeTruthy()
  })

  // Writes to the demo database.
  it('hides Packages when every group is paused, and keeps the past', async () => {
    // Kai cancels his only lesson, then his coach pauses his group.
    await logIn('kai', DEMO_PASSWORD)
    await rpc('cancel_booking', { p_booking_id: 'd0000000-0000-4000-8000-000000000017' })
    await logIn('herman', DEMO_PASSWORD)
    await rpc('set_group_active', {
      p_group_id: 'c0000000-0000-4000-8000-000000000010',
      p_active: false,
    })

    await renderAs('kai')
    expect(await rowsOf('Upcoming')).toEqual([])
    expect(within(section('Upcoming')).getByText('No upcoming lessons.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Book a lesson' }).getAttribute('href')).toBe(
      ROUTES.book,
    )
    // No active group: no students to name, and no package to show.
    expect(await screen.findByText('Kai’s account')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Packages' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Past lessons and receipts' }))
    expect(await rowsOf('Past and cancelled lessons')).toEqual([
      'Fri 2 Oct, 9:00–10:00 pmKai · 1-to-1Palm CourtCancelledCancelled by you on 26 Sep.',
    ])
    expect(await rowsOf('Payments')).toEqual(['24 Sep 2026Kai · 1-to-1 · 4 lessonsFPXRM 240'])
  })

  // Writes to the demo database.
  it('shows the coach’s pinned message 24 px under the title', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await rpc('post_announcement', {
      p_message: 'Pool closed on Friday.\nLessons move to Saturday.',
      p_pinned: true,
      p_send_email: false,
    })
    await renderAs('daniel')
    const banner = (await screen.findByText('Coach:')).parentElement!
    expect(banner.textContent).toBe('Coach: Pool closed on Friday.\nLessons move to Saturday.')
    expect(banner.className).toContain('mt-6')
    // In the head: after the h1, before Upcoming.
    const title = screen.getByRole('heading', { level: 1, name: 'My classes' })
    expect(title.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      banner.compareDocumentPosition(section('Upcoming')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

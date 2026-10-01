import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys, SessionContext, type SessionState } from '@/entities/account'
import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { SchedulePage } from './SchedulePage'

// Demo mode: the real migrations and seed in PGlite, the clock at Sat 26 Sep 2026 12:00 MYT,
// so this week is 21–27 Sep and the booking window (4 weeks) ends with the week of 19 Oct.

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
 * Stands between the page and the demo database: calls of the function `held` wait for
 * release(), so the page can be seen while they run. Records which weeks week_busy reads.
 */
async function holdRpc(held: string) {
  const backend = await getBackend()
  const answer = backend.rpc.bind(backend)
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const spy = vi.spyOn(backend, 'rpc').mockImplementation(async (fn, args) => {
    if (fn === held) await released
    return answer(fn, args)
  })
  const weeksRead = () =>
    spy.mock.calls.filter(([fn]) => fn === 'week_busy').map(([, args]) => args.p_week_start)
  return { release, weeksRead }
}

const PICTURE =
  'Week timetable showing free, booked, travel and closed times. The Book tab lists every free start time.'

/** The page alone on its route (pages may not import app/: no guards). */
function renderPage(
  session: SessionState,
  path: string,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter([{ path: ROUTES.schedule, Component: SchedulePage }], {
    initialEntries: [path],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={session}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

/** The page, signed in as a seeded account (null: signed out). */
async function renderAs(username: string | null, path: string) {
  if (!username) {
    await logOut()
    return renderPage({ status: 'signed-out' }, path)
  }
  return renderPage({ status: 'signed-in', session: await logIn(username, DEMO_PASSWORD) }, path)
}

const weekLabel = () => screen.getByRole('group', { name: 'Week' }).querySelector('[aria-live]')
const previous = () => screen.getByRole('button', { name: 'Previous week' })
const next = () => screen.getByRole('button', { name: 'Next week' })

/** The timetable in words, once the week has loaded. */
async function weekInWords(label: string) {
  const list = await screen.findByRole('list', { name: `Free times and your lessons, ${label}` })
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('SchedulePage', () => {
  it('shows the drawn week of 28 Sep for meiling: her lessons as You, the rest as Booked', async () => {
    const router = await renderAs('meiling', `${ROUTES.schedule}?week=2026-09-28`)
    // The title and the day headers need no data. A week after this one waits for the
    // booking window (the settings) before it is named, read or linked.
    expect(screen.getByRole('heading', { level: 1, name: 'Schedule' })).toBeTruthy()
    expect(screen.getByText('Your coach’s timetable')).toBeTruthy()
    expect(screen.getByText('Mon').parentElement?.textContent).toBe('Mon 28')
    expect(weekLabel()?.textContent).toBe('')
    expect(screen.queryAllByRole('link')).toEqual([])
    expect(screen.getByRole('status').textContent).toBe('Loading the timetable')
    expect(screen.getByRole('img', { name: PICTURE }).getAttribute('aria-busy')).toBe('true')

    expect(await weekInWords('28 Sep – 4 Oct')).toEqual([
      'Mon 28 Sep: free 5:30 pm to 6:30 pm, free 9:30 pm to 10:00 pm',
      'Tue 29 Sep: free 7:30 pm to 10:00 pm',
      'Wed 30 Sep: free 5:30 pm to 7:30 pm',
      'Thu 1 Oct: no free time',
      'Fri 2 Oct: free 5:30 pm to 6:30 pm, free 8:30 pm to 9:00 pm',
      'Sat 3 Oct: free 7:00 am to 8:00 am, your lesson 9:00 am to 10:00 am, free 7:00 pm to 10:00 pm',
      'Sun 4 Oct: your lesson 5:00 pm to 6:00 pm, free 9:00 pm to 10:00 pm',
    ])
    expect(weekLabel()?.textContent).toBe('28 Sep – 4 Oct')
    expect(screen.getAllByText('You')).toHaveLength(2)
    // Other people's lessons carry no names or places (CLAUDE.md rule 6).
    expect(document.body.textContent).not.toMatch(/Hana|Wei Jie|Priya|Palm Court|Kiara Park/)
    expect(screen.getByRole('img', { name: PICTURE }).getAttribute('aria-busy')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()

    const days = within(screen.getByRole('img', { name: PICTURE }).parentElement!.parentElement!)
    const links = days.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Book on Mon 28 Sep',
      'Book on Tue 29 Sep',
      'Book on Wed 30 Sep',
      'Book on Thu 1 Oct',
      'Book on Fri 2 Oct',
      'Book on Sat 3 Oct',
      'Book on Sun 4 Oct',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      ['28', '29', '30']
        .map((d) => `/book?day=2026-09-${d}`)
        .concat(['01', '02', '03', '04'].map((d) => `/book?day=2026-10-${d}`)),
    )
    expect(
      within(screen.getByRole('list', { name: 'Legend' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Free', 'Booked', 'Travel', 'Yours', 'Closed'])
    expect(
      screen.getByText(
        'Other students’ lessons show as Booked, without names. Tap a day to book it.',
      ),
    ).toBeTruthy()
    expect(previous().getAttribute('aria-disabled')).toBeNull()
    await waitFor(() => expect(next().getAttribute('aria-disabled')).toBeNull())
    await waitFor(() => expect(document.title).toBe('Schedule · Swim Class'))
    expect(router.state.location.search).toBe('?week=2026-09-28')
  })

  it('opens on this week, with past days as plain text, and writes the week in the address', async () => {
    const router = await renderAs('meiling', ROUTES.schedule)
    expect(weekLabel()?.textContent).toBe('21 Sep – 27 Sep')
    expect(await weekInWords('21 Sep – 27 Sep')).toEqual([
      'Mon 21 Sep: free 5:30 pm to 10:00 pm',
      'Tue 22 Sep: free 5:30 pm to 10:00 pm',
      'Wed 23 Sep: free 5:30 pm to 10:00 pm',
      'Thu 24 Sep: free 5:30 pm to 10:00 pm',
      'Fri 25 Sep: free 5:30 pm to 6:30 pm, free 9:30 pm to 10:00 pm',
      'Sat 26 Sep: free 7:00 am to 8:00 am, free 11:00 am to 12:00 pm, your lesson 5:00 pm to 6:00 pm, free 9:30 pm to 10:00 pm',
      'Sun 27 Sep: free 7:00 am to 12:00 pm, free 4:00 pm to 10:00 pm',
    ])
    expect(screen.getAllByText('You')).toHaveLength(1)
    // Monday to Friday are past: Book can only cross their times out.
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Book on Sat 26 Sep',
      'Book on Sun 27 Sep',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/book?day=2026-09-26',
      '/book?day=2026-09-27',
    ])
    expect(screen.getByText('Mon').parentElement?.textContent).toBe('Mon 21')
    await waitFor(() => expect(router.state.location.search).toBe('?week=2026-09-21'))
    expect(router.state.historyAction).toBe('REPLACE')

    // This week is the first one: Previous keeps focus and does nothing.
    expect(previous().getAttribute('aria-disabled')).toBe('true')
    previous().focus()
    fireEvent.click(previous())
    expect(weekLabel()?.textContent).toBe('21 Sep – 27 Sep')
    expect(document.activeElement).toBe(previous())
  })

  it('steps through the booking window with Previous and Next, replacing the address', async () => {
    const router = await renderAs('meiling', `${ROUTES.schedule}?week=2026-09-28`)
    await waitFor(() => expect(next().getAttribute('aria-disabled')).toBeNull())
    fireEvent.click(next())
    expect(weekLabel()?.textContent).toBe('5 Oct – 11 Oct')
    expect(router.state.location.search).toBe('?week=2026-10-05')
    expect(router.state.historyAction).toBe('REPLACE')
    // A week with no lessons: the weekly hours only (customer-schedule §8.3).
    const words = await weekInWords('5 Oct – 11 Oct')
    expect(words[0]).toBe('Mon 5 Oct: free 5:30 pm to 10:00 pm')
    expect(words[5]).toBe('Sat 10 Oct: free 7:00 am to 12:00 pm, free 4:00 pm to 10:00 pm')
    expect(screen.queryByText('You')).toBeNull()

    fireEvent.click(next())
    fireEvent.click(next())
    expect(weekLabel()?.textContent).toBe('19 Oct – 25 Oct')
    // The last week of the window: Next keeps focus and does nothing.
    expect(next().getAttribute('aria-disabled')).toBe('true')
    next().focus()
    fireEvent.click(next())
    expect(weekLabel()?.textContent).toBe('19 Oct – 25 Oct')
    expect(document.activeElement).toBe(next())

    fireEvent.click(previous())
    expect(weekLabel()?.textContent).toBe('12 Oct – 18 Oct')
    expect(router.state.location.search).toBe('?week=2026-10-12')
  })

  it.each([
    ['2026-11-02', '19 Oct – 25 Oct', '2026-10-19'],
    ['2026-10-01', '28 Sep – 4 Oct', '2026-09-28'],
    ['2026-09-01', '21 Sep – 27 Sep', '2026-09-21'],
    ['2026-02-30', '21 Sep – 27 Sep', '2026-09-21'],
    ['soon', '21 Sep – 27 Sep', '2026-09-21'],
  ])('shows ?week=%s as %s and corrects the address', async (asked, label, monday) => {
    const router = await renderAs('meiling', `${ROUTES.schedule}?week=${asked}`)
    await waitFor(() => expect(weekLabel()?.textContent).toBe(label))
    await waitFor(() => expect(router.state.location.search).toBe(`?week=${monday}`))
    await weekInWords(label)
  })

  it('names, reads and links a later week only once the booking window is known', async () => {
    const settings = await holdRpc('get_public_settings')
    const router = await renderAs('meiling', `${ROUTES.schedule}?week=2026-11-02`)
    // Give the page time to read anything it would: it reads nothing for 2 Nov.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(weekLabel()?.textContent).toBe('')
    expect(screen.queryAllByRole('link')).toEqual([])
    expect(screen.getByRole('status').textContent).toBe('Loading the timetable')
    expect(previous().getAttribute('aria-disabled')).toBe('true')
    expect(next().getAttribute('aria-disabled')).toBe('true')
    expect(router.state.location.search).toBe('?week=2026-11-02')
    expect(settings.weeksRead()).toEqual([])

    // 2 Nov is past the window's last week: that week is shown instead, and only it is read.
    settings.release()
    await waitFor(() => expect(weekLabel()?.textContent).toBe('19 Oct – 25 Oct'))
    await weekInWords('19 Oct – 25 Oct')
    expect(router.state.location.search).toBe('?week=2026-10-19')
    expect(settings.weeksRead()).toEqual(['2026-10-19'])
    expect(screen.getAllByRole('link')).toHaveLength(7)
  })

  it('shows the coach every lesson as Booked, with none of his own', async () => {
    await renderAs('herman', `${ROUTES.schedule}?week=2026-09-28`)
    const words = await weekInWords('28 Sep – 4 Oct')
    expect(words[5]).toBe('Sat 3 Oct: free 7:00 am to 8:00 am, free 7:00 pm to 10:00 pm')
    expect(words.join(' ')).not.toContain('your lesson')
    expect(screen.queryByText('You')).toBeNull()
  })

  it('says what went wrong over the empty grid, and Try again reads the week again', async () => {
    // Signed out, the settings and week_busy refuse (permission denied: the generic message).
    const router = await renderAs(null, `${ROUTES.schedule}?week=2026-09-28`)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Something went wrong. Refresh the page and try again.')
    expect(screen.getByRole('img', { name: PICTURE }).getAttribute('aria-busy')).toBeNull()
    expect(screen.queryByText('Loading the timetable')).toBeNull()
    // Without the settings only this week is known to be in the window: the week asked for
    // gives way to it, and Next waits.
    expect(weekLabel()?.textContent).toBe('21 Sep – 27 Sep')
    await waitFor(() => expect(router.state.location.search).toBe('?week=2026-09-21'))
    expect(next().getAttribute('aria-disabled')).toBe('true')
    // The headers and their links stay.
    expect(screen.getByRole('link', { name: 'Book on Sat 26 Sep' })).toBeTruthy()

    // Still signed out: while the week is read again, Try again stays, busy, with focus.
    const weekBusy = await holdRpc('week_busy')
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(screen.getByRole('alert')).toBe(alert)
    expect(screen.queryByText('Loading the timetable')).toBeNull()
    expect(document.activeElement).toBe(retry)
    weekBusy.release()
    // It fails again: the message is read out again, and focus is still on Try again.
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBeNull())
    expect(screen.getByRole('alert')).not.toBe(alert)
    expect(document.activeElement).toBe(retry)

    // Signed in, Try again brings the week, and focus goes on to it.
    await logIn('meiling', DEMO_PASSWORD)
    fireEvent.click(retry)
    expect(await weekInWords('21 Sep – 27 Sep')).toHaveLength(7)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(retry.isConnected).toBe(false)
    const focused = document.activeElement
    expect(focused).not.toBe(document.body)
    expect(focused?.contains(screen.getByRole('img', { name: PICTURE }))).toBe(true)
  })

  // Writes to the demo database (a new sign-up): after the tests that read the seed.
  it('tells an account that isn’t approved why, and reads its profile again', async () => {
    await logOut()
    await signUp({
      username: 'waiting.week',
      displayName: 'Wai Ting',
      email: 'waiting.week@example.com',
      phone: null,
      password: DEMO_PASSWORD,
    })
    const session = await logIn('waiting.week', DEMO_PASSWORD)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // The profile the guard holds: re-reading it sends the account to Waiting for approval.
    queryClient.setQueryData(accountKeys.me(session.userId), null)
    renderPage({ status: 'signed-in', session }, ROUTES.schedule, queryClient)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Your coach hasn’t approved your account yet.')
    // Trying again can't help.
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    await waitFor(() =>
      expect(queryClient.getQueryState(accountKeys.me(session.userId))?.isInvalidated).toBe(true),
    )
  })

  // Writes to the demo database: keep it last.
  it('shows the coach’s pinned message between the week and the legend', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await rpc('post_announcement', {
      p_message: 'Pool closed on Friday.\nLessons move to Saturday.',
      p_pinned: true,
      p_send_email: false,
    })
    await renderAs('meiling', `${ROUTES.schedule}?week=2026-09-28`)
    const label = await screen.findByText('Coach:')
    const banner = label.parentElement!
    expect(banner.textContent).toBe('Coach: Pool closed on Friday.\nLessons move to Saturday.')
    const legend = screen.getByRole('list', { name: 'Legend' })
    expect(banner.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(next().compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

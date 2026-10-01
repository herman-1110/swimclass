import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { CoachSchedulePage } from './CoachSchedulePage'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 2026, 12:00 pm). Nothing here changes the data: the actions are in
// CoachSchedulePage.flows.test.tsx. jsdom has no CSS, so the week grid (768 px and up) and
// the day view (phones) are both in the page: queries look inside one or the other.

const SLOW = { timeout: 4000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

/** The page alone on its route, signed in (pages may not import app/, so no guards). */
async function renderPage(path: string, username = 'herman') {
  const session = await logIn(username, DEMO_PASSWORD)
  const router = createMemoryRouter(
    [
      { path: ROUTES.coachSchedule, Component: CoachSchedulePage },
      { path: ROUTES.coachStudents, element: <h1>Students & payments</h1> },
    ],
    { initialEntries: [path] },
  )
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

/** The week grid (768 px and up), once the week is in. */
async function grid(label: string) {
  const region = await screen.findByRole('region', { name: `Week of ${label}` })
  await waitFor(() => expect(region.getAttribute('aria-busy')).toBeNull(), SLOW)
  return region
}

function texts(elements: HTMLElement[]) {
  return elements.map((element) => element.textContent)
}

function section(name: string) {
  return screen.getByRole('region', { name })
}

describe('CoachSchedulePage, opening on today’s week (§8.1)', () => {
  it('shows its title at once, and the week of 21 Sep with today chosen', async () => {
    await renderPage(ROUTES.coachSchedule)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Schedule' })).toBeTruthy()
    expect(screen.queryByRole('main')).toBeNull()
    await waitFor(() => expect(document.title).toBe('Schedule · Swim Class'), SLOW)
    const week = screen.getByRole('group', { name: 'Week' })
    expect(within(week).getByText('21–27 Sep 2026')).toBeTruthy()
    for (const name of ['Block time', 'Open extra time', 'Add booking', 'Today']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    const region = await grid('21–27 Sep 2026')
    expect(texts(within(region).getAllByRole('button'))).toHaveLength(4)
    for (const name of [
      'Wei Jie, 7:30–8:30 pm, Palm Court, Fri 25 Sep, unpaid',
      'Ethan, 9:00–10:00 am, Kiara Park, Sat 26 Sep',
      'Aiman & Sofia, 5:00–6:00 pm, 1-to-2 · Palm Court, Sat 26 Sep',
      'Hana, 7:30–8:30 pm, Sunrise Res., Sat 26 Sep, unpaid',
    ]) {
      expect(within(region).getByRole('button', { name })).toBeTruthy()
    }
  })

  it('shows Saturday 26 Sep in the phone’s day view, block by block', async () => {
    await renderPage(ROUTES.coachSchedule)
    await grid('21–27 Sep 2026')
    const days = screen.getByRole('group', { name: 'Days' })
    expect(
      within(days)
        .getAllByRole('button')
        .map((day) => day.getAttribute('aria-label')),
    ).toEqual([
      'Monday 21 Sep, 0 lessons',
      'Tuesday 22 Sep, 0 lessons',
      'Wednesday 23 Sep, 0 lessons',
      'Thursday 24 Sep, 0 lessons',
      'Friday 25 Sep, 1 lesson',
      'Saturday 26 Sep, 3 lessons',
      'Sunday 27 Sep, 0 lessons',
    ])
    expect(
      within(days)
        .getByRole('button', { name: 'Saturday 26 Sep, 3 lessons' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    const list = screen.getByRole('list', { name: 'Saturday 26 Sep' })
    expect(texts(within(list).getAllByRole('listitem'))).toEqual([
      '7:00 am Free 7:00–8:00 am',
      '8:00 am Travel 8:00–9:00 am',
      '9:00 am Ethan 9:00–10:00 am · Kiara Park',
      '10:00 am Travel 10:00–11:00 am',
      '11:00 am Free 11:00 am–12:00 pm',
      '12:00 pm Closed 12:00–4:00 pm',
      '4:00 pm Travel 4:00–5:00 pm',
      '5:00 pm Aiman & Sofia 5:00–6:00 pm · 1-to-2 · Palm Court',
      '6:00 pm Travel 6:00–7:30 pm',
      '7:30 pm Hana 7:30–8:30 pm · Sunrise Res. Unpaid',
      '8:30 pm Travel 8:30–9:30 pm',
      '9:30 pm Free 9:30–10:00 pm',
    ])
  })

  it('lists today’s lessons as drawn', async () => {
    await renderPage(ROUTES.coachSchedule)
    const aside = screen.getByRole('complementary', { name: 'Today and messages' })
    const today = within(aside).getByRole('region', { name: 'Today, Sat 26 Sep' })
    const rows = await within(today).findAllByRole('listitem', {}, SLOW)
    expect(texts(rows)).toEqual([
      '9:00 am Ethan Kiara Park · done',
      '5:00 pm Aiman & Sofia Palm Court · 1-to-2, lesson 1 of 4',
      '7:30 pm Hana Sunrise Res. · first lesson of Package 6 Unpaid, collect today',
    ])
  })

  it('lists what needs attention, with Record payment for the groups that owe', async () => {
    const router = await renderPage(ROUTES.coachSchedule)
    const attention = section('Needs attention')
    const rows = await within(attention).findAllByRole('listitem', {}, SLOW)
    expect(texts(rows)).toEqual([
      'Hana Package 6 unpaidRecord payment for Hana',
      'Wei Jie Package 2 unpaid · 2 usedRecord payment for Wei Jie',
      'Priya Last lesson of Package 4 on Thu 1 Oct',
      'Sofia Last lesson of Package 2 on Sun 4 Oct',
    ])
    const pay = within(attention).getByRole('link', { name: 'Record payment for Hana' })
    expect(pay.getAttribute('href')).toBe(
      '/coach/students?pay=c0000000-0000-4000-8000-000000000003',
    )
    fireEvent.click(pay)
    await screen.findByRole('heading', { level: 1, name: 'Students & payments' })
    expect(router.state.location.search).toBe('?pay=c0000000-0000-4000-8000-000000000003')
  })

  it('has an empty message form with the pin box checked', async () => {
    await renderPage(ROUTES.coachSchedule)
    const message = section('Message all customers')
    expect(within(message).getByRole('textbox', { name: 'Message all customers' })).toBeTruthy()
    expect(
      within(message).getByRole('checkbox', { name: 'Pin as a banner until I remove it' }),
    ).toHaveProperty('checked', true)
    expect(
      within(message)
        .getByRole('button', { name: 'Send to all customers' })
        .getAttribute('aria-disabled'),
    ).toBe('true')
  })
})

describe('CoachSchedulePage, moving through the weeks (§8.2)', () => {
  it('shows the drawn week after “Next week”, keeping Saturday', async () => {
    const router = await renderPage(ROUTES.coachSchedule)
    await grid('21–27 Sep 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(router.state.location.search).toBe('?day=2026-10-03')
    const region = await grid('28 Sep – 4 Oct 2026')
    expect(within(region).getAllByRole('button')).toHaveLength(14)
    expect(
      within(screen.getByRole('group', { name: 'Week' })).getByText('28 Sep – 4 Oct 2026'),
    ).toBeTruthy()
    const days = screen.getByRole('group', { name: 'Days' })
    expect(
      within(days)
        .getAllByRole('button')
        .map((day) => day.textContent),
    ).toEqual([
      'Mon281 lesson',
      'Tue291 lesson',
      'Wed301 lesson',
      'Thu12 lessons',
      'Fri22 lessons',
      'Sat33 lessons',
      'Sun44 lessons',
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'Saturday 3 Oct' })).toBeTruthy()
    // Today stays today.
    expect(screen.getByRole('region', { name: 'Today, Sat 26 Sep' })).toBeTruthy()
  })

  it('goes back a week, and “Today” comes home', async () => {
    const router = await renderPage(ROUTES.coachSchedule)
    await grid('21–27 Sep 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    const region = await grid('14–20 Sep 2026')
    expect(texts(within(region).getAllByRole('button'))).toEqual([
      'Wei Jie, 7:30–8:30 pm, Palm Court, Fri 18 Sep, unpaid',
      'Adam, Alya & Amir, 11 am–12 pm, 1-to-3 · Maple Condo, Sat 19 Sep',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(router.state.location.search).toBe('')
    await grid('21–27 Sep 2026')
  })

  it('opens the week of ?day, and today’s week for a day that isn’t a date', async () => {
    await renderPage(`${ROUTES.coachSchedule}?day=2026-10-07`)
    await grid('5–11 Oct 2026')
    expect(screen.getByRole('heading', { level: 2, name: 'Wednesday 7 Oct' })).toBeTruthy()
    cleanup()
    await renderPage(`${ROUTES.coachSchedule}?day=2026-02-30`)
    await grid('21–27 Sep 2026')
  })

  it('picks a day on the phone’s strip', async () => {
    const router = await renderPage(ROUTES.coachSchedule)
    await grid('21–27 Sep 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Friday 25 Sep, 1 lesson' }))
    expect(router.state.location.search).toBe('?day=2026-09-25')
    const list = screen.getByRole('list', { name: 'Friday 25 Sep' })
    expect(within(list).getByRole('button', { name: /^Wei Jie/ })).toBeTruthy()
  })
})

describe('CoachSchedulePage, a lesson’s details (§7.4)', () => {
  it('shows a future lesson with its group, place, position and package', async () => {
    await renderPage(`${ROUTES.coachSchedule}?day=2026-10-03`)
    const region = await grid('28 Sep – 4 Oct 2026')
    const block = within(region).getByRole('button', {
      name: 'Aiman & Sofia, 9:00–10:00 am, 1-to-2 · Palm Court, Sat 3 Oct',
    })
    fireEvent.click(block)
    const dialog = screen.getByRole('dialog', {
      name: 'Aiman & Sofia',
      description: 'Sat 3 Oct, 9:00–10:00 am',
    })
    expect(document.activeElement).toBe(
      within(dialog).getByRole('heading', { name: 'Aiman & Sofia' }),
    )
    const facts = within(dialog).getAllByRole('definition')
    expect(texts(facts.slice(0, 3))).toEqual([
      '1-to-2 Mei Ling’s account',
      'Palm Court',
      'Package 4 · lesson 2 of 4',
    ])
    await within(dialog).findByText('1-to-2 · Package 4', {}, SLOW)
    expect(within(dialog).getByText('0 used · 2 booked · 2 left to book')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Cancel lesson' })).toBeTruthy()
    expect(within(dialog).getByText('You can mark it as excused once it has started.')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Mark as excused' })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('offers “Mark as excused” for a lesson that has happened, with its flags', async () => {
    await renderPage(ROUTES.coachSchedule)
    const region = await grid('21–27 Sep 2026')
    fireEvent.click(within(region).getByRole('button', { name: /^Wei Jie/ }))
    const dialog = screen.getByRole('dialog', { name: 'Wei Jie' })
    const facts = within(dialog).getAllByRole('definition')
    expect(facts[2].textContent).toBe('Package 2 · lesson 2 of 4 · done')
    expect(facts[3].textContent).toBe('Unpaid')
    expect(within(dialog).getByRole('button', { name: 'Mark as excused' })).toBeTruthy()
    expect(
      within(dialog).getByText(
        'This lesson has already happened. If it shouldn’t count, mark it as excused instead of cancelling.',
      ),
    ).toBeTruthy()
  })
})

describe('CoachSchedulePage when the week can’t be read', () => {
  it('says so in place of the week, with Try again (§6.1)', async () => {
    // A customer is refused coach_week (not_coach): the generic words.
    await renderPage(ROUTES.coachSchedule, 'meiling')
    const alerts = await screen.findAllByRole('alert', {}, SLOW)
    expect(alerts.map((alert) => alert.textContent)).toContain(
      'Something went wrong. Refresh the page and try again.Try again',
    )
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(1)
    // The title and the week label never wait for data.
    expect(screen.getByRole('heading', { level: 1, name: 'Schedule' })).toBeTruthy()
    expect(
      within(screen.getByRole('group', { name: 'Week' })).getByText('21–27 Sep 2026'),
    ).toBeTruthy()
  })
})

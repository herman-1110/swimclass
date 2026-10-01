import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { CoachSchedulePage } from './CoachSchedulePage'

// The Schedule spec §8.3, through the page, in demo mode (the real migrations and seed in
// PGlite, clock at DEMO_NOW, Sat 26 Sep 2026 12:00 pm). The changes stay for later tests in
// this file, so each test works on its own days. jsdom has no CSS: the week grid and the
// phone's day view are both in the page.

const SLOW = { timeout: 4000 }
const FLOW = 30_000

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  // The seed has no accounts waiting for approval (§8.3: "Approve").
  await signUp({
    username: 'siti',
    displayName: 'Siti Aminah',
    email: 'siti@example.com',
    phone: null,
    password: DEMO_PASSWORD,
  })
}, 60_000)

afterEach(cleanup)

async function renderPage(path: string) {
  const session = await logIn('herman', DEMO_PASSWORD)
  const router = createMemoryRouter(
    [{ path: ROUTES.coachSchedule, Component: CoachSchedulePage }],
    {
      initialEntries: [path],
    },
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

/** The week grid once its week is in. */
async function grid(label: string) {
  const region = await screen.findByRole('region', { name: `Week of ${label}` }, SLOW)
  await waitFor(() => expect(region.getAttribute('aria-busy')).toBeNull(), SLOW)
  return region
}

/** The notice under the toolbar, once it says `text`. */
async function notice(text: string) {
  const found = await screen.findByText(text, {}, SLOW)
  expect(found.closest('[role="status"]')).toBeTruthy()
  return found
}

function submit(dialog: HTMLElement) {
  const [button] = within(dialog)
    .getAllByRole('button')
    .filter((each) => each.getAttribute('type') === 'submit')
  return button
}

describe('CoachSchedulePage actions (§8.3)', () => {
  it(
    'approves a waiting account from Needs attention',
    async () => {
      await renderPage(ROUTES.coachSchedule)
      const attention = screen.getByRole('region', { name: 'Needs attention' })
      const approve = await within(attention).findByRole(
        'button',
        { name: 'Approve Siti Aminah' },
        SLOW,
      )
      expect(approve.closest('li')?.textContent).toMatch(
        /^Siti Aminah Waiting for approval · signed up \w{3} \d+ \w{3}Approve Siti Aminah$/,
      )
      fireEvent.click(approve)
      const shown = await notice('Siti Aminah approved')
      // Its row goes, so focus goes to the notice.
      await waitFor(() => expect(document.activeElement?.contains(shown)).toBe(true))
      await waitFor(
        () => expect(within(attention).queryByRole('button', { name: /^Approve/ })).toBeNull(),
        SLOW,
      )
    },
    FLOW,
  )

  it(
    'sends a pinned message to all customers, then removes it',
    async () => {
      await renderPage(ROUTES.coachSchedule)
      const message = screen.getByRole('region', { name: 'Message all customers' })
      fireEvent.change(within(message).getByRole('textbox', { name: 'Message all customers' }), {
        target: { value: 'Pool maintenance on Saturday morning. Those lessons move to 4 pm.' },
      })
      fireEvent.click(within(message).getByRole('button', { name: 'Send to all customers' }))
      await notice('Sent to all customers.')
      const pinned = await within(message).findByRole('list', { name: 'Pinned messages' }, SLOW)
      expect(within(pinned).getByRole('listitem').textContent).toContain('Customers see this one')
      fireEvent.click(within(pinned).getByRole('button', { name: /^Remove message posted/ }))
      const confirm = screen.getByRole('alertdialog', { name: 'Remove this message?' })
      fireEvent.click(within(confirm).getByRole('button', { name: 'Remove message' }))
      await notice('Message removed.')
      await waitFor(
        () => expect(within(message).queryByRole('list', { name: 'Pinned messages' })).toBeNull(),
        SLOW,
      )
    },
    FLOW,
  )

  it(
    'blocks Sat 3 Oct 7:00–9:00 am, lists it with its note, and removes it',
    async () => {
      const router = await renderPage(`${ROUTES.coachSchedule}?day=2026-10-03`)
      await grid('28 Sep – 4 Oct 2026')
      fireEvent.click(screen.getByRole('button', { name: 'Block time' }))
      const dialog = screen.getByRole('dialog', { name: 'Block time' })
      const to = within(dialog).getByRole<HTMLSelectElement>('combobox', { name: 'To' })
      await waitFor(() => expect(to.value).toBe('22:00'), SLOW)
      fireEvent.change(to, { target: { value: '09:00' } })
      fireEvent.change(within(dialog).getByLabelText('Note (optional)'), {
        target: { value: 'Pool maintenance' },
      })
      fireEvent.click(submit(dialog))
      await notice('Time blocked.')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(router.state.location.search).toBe('?day=2026-10-03')
      const list = await screen.findByRole('region', { name: 'Blocked and extra time' }, SLOW)
      expect(within(list).getByRole('listitem').textContent).toBe(
        'Sat 3 Oct, 7:00–9:00 am Blocked · Pool maintenanceRemove blocked time, Sat 3 Oct, 7:00–9:00 am',
      )
      // The 8–9 am travel isn't drawn any more: it is outside open time.
      const saturday = screen.getByRole('list', { name: 'Saturday 3 Oct' })
      expect(within(saturday).getAllByRole('listitem')[0].textContent).toBe(
        '7:00 am Closed 7:00–9:00 am',
      )
      fireEvent.click(
        within(list).getByRole('button', { name: 'Remove blocked time, Sat 3 Oct, 7:00–9:00 am' }),
      )
      const shown = await notice('Blocked time removed.')
      await waitFor(() => expect(document.activeElement?.contains(shown)).toBe(true))
      await waitFor(
        () => expect(screen.queryByRole('region', { name: 'Blocked and extra time' })).toBeNull(),
        SLOW,
      )
    },
    FLOW,
  )

  it(
    'opens extra time on Wed 7 Oct, 3:00–5:30 pm, and shows that week',
    async () => {
      const router = await renderPage(`${ROUTES.coachSchedule}?day=2026-10-03`)
      await grid('28 Sep – 4 Oct 2026')
      fireEvent.click(screen.getByRole('button', { name: 'Open extra time' }))
      const dialog = screen.getByRole('dialog', { name: 'Open extra time' })
      fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-10-07' } })
      const from = within(dialog).getByRole<HTMLSelectElement>('combobox', { name: 'From' })
      await waitFor(() => expect(from.options.length).toBeGreaterThan(1), SLOW)
      fireEvent.change(from, { target: { value: '15:00' } })
      fireEvent.change(within(dialog).getByRole('combobox', { name: 'To' }), {
        target: { value: '17:30' },
      })
      fireEvent.click(submit(dialog))
      await notice('Extra time opened.')
      expect(router.state.location.search).toBe('?day=2026-10-07')
      await grid('5–11 Oct 2026')
      const list = await screen.findByRole('region', { name: 'Blocked and extra time' }, SLOW)
      expect(within(list).getByRole('listitem').textContent).toMatch(
        /^Wed 7 Oct, 3:00–5:30 pm Extra time/,
      )
      const wednesday = screen.getByRole('list', { name: 'Wednesday 7 Oct' })
      expect(within(wednesday).getByText('3:00–10:00 pm')).toBeTruthy()
    },
    FLOW,
  )

  it(
    'adds a booking for Aiman & Sofia on Tue 29 Sep at 7:30 pm',
    async () => {
      const router = await renderPage(ROUTES.coachSchedule)
      await grid('21–27 Sep 2026')
      fireEvent.click(screen.getByRole('button', { name: 'Add booking' }))
      const dialog = screen.getByRole('dialog', { name: 'Add booking' })
      expect(within(dialog).getByLabelText<HTMLInputElement>('Date').value).toBe('2026-09-26')
      const radio = await within(dialog).findByRole('radio', { name: /^Aiman & Sofia/ }, SLOW)
      fireEvent.click(radio)
      fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-09-29' } })
      fireEvent.change(within(dialog).getByLabelText('Start'), { target: { value: '19:30' } })
      await waitFor(
        () => expect(submit(dialog).textContent).toBe('Book 7:30 pm for Aiman & Sofia'),
        SLOW,
      )
      fireEvent.click(submit(dialog))
      await notice('Booked Tue 29 Sep, 7:30–8:30 pm for Aiman & Sofia.')
      expect(router.state.location.search).toBe('?day=2026-09-29')
      const region = await grid('28 Sep – 4 Oct 2026')
      await within(region).findByRole(
        'button',
        { name: 'Aiman & Sofia, 7:30–8:30 pm, 1-to-2 · Palm Court, Tue 29 Sep' },
        SLOW,
      )
      // Tuesday: Priya, one travel block between (her after, the new lesson's before), travel.
      const tuesday = screen.getByRole('list', { name: 'Tuesday 29 Sep' })
      expect(
        within(tuesday)
          .getAllByRole('listitem')
          .map((item) => item.textContent)
          .slice(1),
      ).toEqual([
        '5:30 pm Priya 5:30–6:30 pm · Seri Maya',
        '6:30 pm Travel 6:30–7:30 pm',
        '7:30 pm Aiman & Sofia 7:30–8:30 pm · 1-to-2 · Palm Court',
        '8:30 pm Travel 8:30–9:30 pm',
        '9:30 pm Free 9:30–10:00 pm',
      ])
    },
    FLOW,
  )

  it(
    'cancels Priya’s Tue 29 Sep lesson with a reason, and she leaves Needs attention',
    async () => {
      await renderPage(`${ROUTES.coachSchedule}?day=2026-09-29`)
      const region = await grid('28 Sep – 4 Oct 2026')
      const attention = screen.getByRole('region', { name: 'Needs attention' })
      await within(attention).findByText('Last lesson of Package 4 on Thu 1 Oct', {}, SLOW)
      fireEvent.click(
        within(region).getByRole('button', { name: /^Priya, 5:30–6:30 pm, Seri Maya, Tue 29 Sep/ }),
      )
      const details = screen.getByRole('dialog', { name: 'Priya' })
      fireEvent.click(within(details).getByRole('button', { name: 'Cancel lesson' }))
      const confirm = screen.getByRole('alertdialog', {
        name: 'Cancel Tue 29 Sep, 5:30–6:30 pm for Priya?',
      })
      fireEvent.change(within(confirm).getByRole('textbox', { name: 'Reason (optional)' }), {
        target: { value: 'Pool closed for maintenance' },
      })
      fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel lesson' }))
      const shown = await notice('Lesson cancelled. Priya will get an email.')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.queryByRole('alertdialog')).toBeNull()
      await waitFor(() => expect(document.activeElement?.contains(shown)).toBe(true))
      await waitFor(
        () =>
          expect(
            within(region).queryByRole('button', { name: /^Priya, 5:30–6:30 pm, Seri Maya, Tue/ }),
          ).toBeNull(),
        SLOW,
      )
      await waitFor(
        () =>
          expect(within(attention).queryByText('Last lesson of Package 4 on Thu 1 Oct')).toBeNull(),
        SLOW,
      )
    },
    FLOW,
  )

  it(
    'marks Wei Jie’s Fri 25 Sep lesson as excused, so he owes one lesson less',
    async () => {
      await renderPage(ROUTES.coachSchedule)
      const region = await grid('21–27 Sep 2026')
      const attention = screen.getByRole('region', { name: 'Needs attention' })
      await within(attention).findByText('Package 2 unpaid · 2 used', {}, SLOW)
      fireEvent.click(within(region).getByRole('button', { name: /^Wei Jie/ }))
      const details = screen.getByRole('dialog', { name: 'Wei Jie' })
      fireEvent.click(within(details).getByRole('button', { name: 'Mark as excused' }))
      const confirm = screen.getByRole('alertdialog', {
        name: 'Mark Fri 25 Sep, 7:30–8:30 pm for Wei Jie as excused?',
      })
      fireEvent.click(within(confirm).getByRole('button', { name: 'Mark as excused' }))
      await notice('Lesson marked as excused. It no longer counts.')
      await within(attention).findByText('Package 2 unpaid · 1 used', {}, SLOW)
      await waitFor(
        () => expect(within(region).queryByRole('button', { name: /^Wei Jie/ })).toBeNull(),
        SLOW,
      )
    },
    FLOW,
  )
})

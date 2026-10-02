import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { GENERIC_MESSAGE } from '@/shared/config/messages'

import { CoachSettingsPage } from './CoachSettingsPage'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW, signed in as
// herman (the coach-settings spec §8). Tests that save put the seed's values back.

const SAVE_WAIT = { timeout: 4000 }

const SEED_RULES = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens_at: '17:30', closes_at: '22:00' })),
  ...[6, 7].flatMap((weekday) => [
    { weekday, opens_at: '07:00', closes_at: '12:00' },
    { weekday, opens_at: '16:00', closes_at: '22:00' },
  ]),
]

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function restoreSeed() {
  await logIn('herman', DEMO_PASSWORD)
  await rpc('set_open_hours', { p_rules: SEED_RULES })
  await rpc('update_settings', {
    p_settings: {
      travel_gap_minutes: 60,
      lesson_lengths: [60, 120],
      cancel_cutoff_hours: 6,
      booking_window_weeks: 4,
      lessons_per_package: 4,
      coach_email: 'herman@example.com',
    },
  })
}

async function saved() {
  const [settings] = await readRows('settings', { eq: { id: 1 } })
  return settings
}

/**
 * Holds every read of `source` until release() (the demo database would answer before the
 * test could look), and counts them.
 */
async function holdReads(source: string) {
  const backend = await getBackend()
  const read = backend.read.bind(backend)
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const spy = vi.spyOn(backend, 'read').mockImplementation(async (from, query) => {
    if (from === source) await held
    return read(from, query)
  })
  return {
    count: () => spy.mock.calls.filter(([from]) => from === source).length,
    release,
    restore: () => {
      release()
      spy.mockRestore()
    },
  }
}

async function savedHours(weekday: number) {
  const rows = await readRows('availability_rules', {
    columns: ['opens_at', 'closes_at'],
    eq: { weekday },
    order: [{ column: 'opens_at' }],
  })
  return rows.map((row) => `${row.opens_at}–${row.closes_at}`)
}

// A stand-in for the coach layout: a link out of the page, for the leave guard.
function Shell() {
  return (
    <>
      <Link to="/coach/schedule">Schedule</Link>
      <Outlet />
    </>
  )
}

function renderPage(entry = '/coach/settings') {
  const router = createMemoryRouter(
    [
      {
        Component: Shell,
        children: [
          { path: '/coach/settings', Component: CoachSettingsPage },
          { path: '/coach/schedule', element: <h1>Schedule</h1> },
        ],
      },
    ],
    { initialEntries: [entry] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

/** The page, once the settings and the hours are in. */
async function renderLoaded(entry?: string) {
  const rendered = renderPage(entry)
  await screen.findByRole('textbox', { name: 'Travel gap' }, { timeout: 3000 })
  return rendered
}

const textbox = (name: string) => screen.getByRole<HTMLInputElement>('textbox', { name })
const select = (name: string) => screen.getByRole<HTMLSelectElement>('combobox', { name })
const checkbox = (name: string) => screen.getByRole<HTMLInputElement>('checkbox', { name })
/** The header's and the Save bar's button (jsdom has no CSS, so both are there). */
const saveButtons = () =>
  screen.getAllByRole('button', { name: /^(Save changes|Saving…|Settings saved)$/ })

function type(name: string, value: string) {
  fireEvent.change(textbox(name), { target: { value } })
}

function save() {
  fireEvent.click(saveButtons()[0])
}

/** "Settings saved", announced once. */
function savedAnnouncement() {
  return screen.findByText('Settings saved.', { selector: '[role="status"]' }, SAVE_WAIT)
}

function dayRow(day: string) {
  const row = screen.getByRole('rowheader', { name: day }).closest('tr')
  if (!row) throw new Error(`No row for ${day}`)
  return row
}

function chips(day: string) {
  return within(dayRow(day))
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('CoachSettingsPage', () => {
  it('shows its title at once, with Save unavailable while the settings load', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderPage()
    screen.getByRole('heading', { level: 1, name: 'Settings' })
    screen.getByText('The rules the booking system follows. Changes apply to new bookings.')
    screen.getByText('Loading settings…')
    for (const button of saveButtons()) {
      expect(button.textContent).toBe('Save changes')
      expect(button.getAttribute('aria-disabled')).toBe('true')
    }
    await screen.findByRole('textbox', { name: 'Travel gap' }, { timeout: 3000 })
    await waitFor(() => expect(document.title).toBe('Settings · Swim Class'))
    expect(screen.queryByText('Loading settings…')).toBeNull()
  })

  it('shows the seed’s open hours, each day with its Edit button (§8.1)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    const table = screen.getByRole('table', { name: 'Open hours' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Day', 'Hours', 'Actions'])
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      expect(chips(day)).toEqual(['5:30–10:00 pm'])
    }
    expect(chips('Sat')).toEqual(['7:00 am–12:00 pm', '4:00–10:00 pm'])
    expect(chips('Sun')).toEqual(['7:00 am–12:00 pm', '4:00–10:00 pm'])
    for (const day of [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]) {
      const edit = screen.getByRole('button', { name: `Edit ${day} hours` })
      expect(edit.textContent).toBe('Edit')
      expect(edit.getAttribute('aria-haspopup')).toBe('dialog')
    }
  })

  it('shows the seed’s settings, with Save unavailable until something changes (§8.1)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    expect(screen.getByRole('textbox', { name: 'Travel gap', description: /min$/ })).toBeTruthy()
    expect(textbox('Travel gap').value).toBe('60')
    const lengths = screen.getByRole('group', { name: 'Lesson lengths' })
    expect(within(lengths).getByRole('checkbox', { name: '1 hour' })).toHaveProperty(
      'checked',
      true,
    )
    expect(within(lengths).getByRole('checkbox', { name: '2 hours' })).toHaveProperty(
      'checked',
      true,
    )
    expect(select('Students per lesson').selectedOptions[0]?.textContent).toBe('Up to 3')
    expect(select('Start times').selectedOptions[0]?.textContent).toBe('Every 30 min')
    expect([...select('Start times').options].map((option) => option.textContent)).toEqual([
      'Every 30 min',
      'Every 15 min',
      'Every hour',
    ])
    expect(textbox('Cancel or reschedule').value).toBe('6')
    expect(screen.getByRole('textbox', { name: 'Cancel or reschedule', description: /hours$/ }))
    expect(textbox('Booking window').value).toBe('4')
    expect(checkbox('Approve new accounts').checked).toBe(true)
    expect(textbox('Lessons per package').value).toBe('4')
    const prices = screen.getByRole('group', { name: 'Package prices (RM)' })
    for (const type of ['1-to-1', '1-to-2', '1-to-3']) {
      const price = within(prices).getByRole<HTMLInputElement>('textbox', { name: type })
      expect(price.value).toBe('')
      expect(price.placeholder).toBe('Not set')
    }
    expect(
      screen.getByRole('textbox', { name: 'Unpaid packages allowed', description: /package$/ }),
    )
    const expiry = screen.getByRole<HTMLSelectElement>('combobox', {
      name: 'Unused lessons expire',
      description: 'Counted from when a package is paid Not available yet',
    })
    expect(expiry.disabled).toBe(true)
    expect(expiry.selectedOptions[0]?.textContent).toBe('Never')
    expect(textbox('Payment instructions').value).toBe('')
    screen.getByText('Not connected')
    expect(textbox('Lesson reminder to customers').value).toBe('8:00 pm')
    expect(textbox('Tomorrow’s schedule for you').value).toBe('8:00 pm')
    expect(checkbox('Late-change alert').checked).toBe(true)
    expect(
      screen.getByRole('checkbox', {
        name: 'Booking confirmations',
        description: 'Email customers when they book. Cancellation emails always go out.',
      }),
    ).toHaveProperty('checked', true)
    expect(textbox('Your email').value).toBe('herman@example.com')

    for (const button of saveButtons()) {
      expect(button.getAttribute('aria-disabled')).toBe('true')
    }
    type('Travel gap', '45')
    for (const button of saveButtons()) expect(button.getAttribute('aria-disabled')).toBeNull()
    // Changed back: nothing to save.
    type('Travel gap', '60 ')
    for (const button of saveButtons()) {
      expect(button.getAttribute('aria-disabled')).toBe('true')
    }
  })

  it('saves a travel gap of 30 and shows what was saved (walkthrough 1)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    try {
      type('Travel gap', '30')
      screen.getByRole('textbox', {
        name: 'Travel gap',
        description:
          'Blocked before and after every lesson Changing the travel gap affects times shown to customers straight away. Existing lessons stay booked. min',
      })
      saveButtons()[0].focus()
      save()
      await savedAnnouncement()
      for (const button of saveButtons()) {
        expect(button.textContent).toBe('Settings saved')
        expect(button.getAttribute('aria-disabled')).toBe('true')
      }
      expect(document.activeElement).toBe(saveButtons()[0])
      expect(textbox('Travel gap').value).toBe('30')
      expect(screen.queryByText(/Changing the travel gap/)).toBeNull()
      expect((await saved())?.travel_gap_minutes).toBe(30)

      // The next change turns it back into "Save changes".
      type('Travel gap', '60')
      expect(saveButtons()[0].textContent).toBe('Save changes')
      save()
      await savedAnnouncement()
      expect((await saved())?.travel_gap_minutes).toBe(60)
    } finally {
      await restoreSeed()
    }
  })

  it('shows a refused travel gap under its row and near Save, and focuses it (walkthrough 3)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    type('Travel gap', '500')
    save()
    const words = 'Travel gap has a value that isn’t allowed. Check it and save again.'
    const alerts = await screen.findAllByRole('alert', {}, SAVE_WAIT)
    expect(alerts.map((alert) => alert.textContent)).toEqual([words, words])
    const gap = screen.getByRole('textbox', { name: 'Travel gap', description: new RegExp(words) })
    expect(gap.getAttribute('aria-invalid')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(gap))
    expect((await saved())?.travel_gap_minutes).toBe(60)
    for (const button of saveButtons()) expect(button.textContent).toBe('Save changes')

    // A change clears the field's message; the line near Save stays until the next save.
    type('Travel gap', '50')
    expect(gap.getAttribute('aria-invalid')).toBeNull()
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('refuses a week without lesson lengths, focusing "1 hour" (walkthrough 4)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    fireEvent.click(checkbox('1 hour'))
    fireEvent.click(checkbox('2 hours'))
    screen.getByText(/Changing lesson lengths affects what customers can book straight away/)
    save()
    const words = 'Lesson lengths has a value that isn’t allowed. Check it and save again.'
    await waitFor(() => expect(screen.getAllByText(words)).toHaveLength(3), SAVE_WAIT)
    expect(screen.getByRole('group', { name: 'Lesson lengths', description: new RegExp(words) }))
    await waitFor(() => expect(document.activeElement).toBe(checkbox('1 hour')))
    expect((await saved())?.lesson_lengths).toEqual([60, 120])
  })

  it('checks numbers, amounts and times before sending anything (walkthrough 7)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    type('Lesson reminder to customers', '24:00')
    type('Booking window', 'four')
    fireEvent.change(
      within(screen.getByRole('group', { name: 'Package prices (RM)' })).getByRole('textbox', {
        name: '1-to-2',
      }),
      { target: { value: '-5' } },
    )
    save()
    const window = 'Booking window has a value that isn’t allowed. Check it and save again.'
    // At once, with no call: the first one near Save and focused, each under its row.
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([window, window])
    screen.getByText('1-to-2 price has a value that isn’t allowed. Check it and save again.')
    screen.getByText(
      'Lesson reminder to customers has a value that isn’t allowed. Check it and save again.',
    )
    await waitFor(() => expect(document.activeElement).toBe(textbox('Booking window')))
    expect(textbox('Lesson reminder to customers').getAttribute('aria-invalid')).toBe('true')
    expect((await saved())?.reminder_time).toBe('20:00:00')
  })

  it('shows a typed time again in words when the box is left', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    type('Tomorrow’s schedule for you', '19:45')
    fireEvent.blur(textbox('Tomorrow’s schedule for you'))
    expect(textbox('Tomorrow’s schedule for you').value).toBe('7:45 pm')
    type('Lesson reminder to customers', '8PM')
    fireEvent.blur(textbox('Lesson reminder to customers'))
    expect(textbox('Lesson reminder to customers').value).toBe('8:00 pm')
  })

  it('sets Saturday from 8:00 am and saves the whole week (walkthrough 2)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    try {
      const edit = screen.getByRole('button', { name: 'Edit Saturday hours' })
      edit.focus()
      fireEvent.click(edit)
      const dialog = screen.getByRole('dialog', { name: 'Saturday hours' })
      fireEvent.change(
        within(within(dialog).getByRole('group', { name: 'Hours 1' })).getByRole('combobox', {
          name: 'From',
        }),
        { target: { value: '08:00' } },
      )
      fireEvent.click(within(dialog).getByRole('button', { name: 'Set Saturday hours' }))
      expect(screen.queryByRole('dialog', { name: 'Saturday hours' })).toBeNull()
      expect(document.activeElement).toBe(edit)
      expect(chips('Sat')).toEqual(['8:00 am–12:00 pm', '4:00–10:00 pm'])
      screen.getByText(
        'Changing open hours affects times shown to customers straight away. Existing lessons stay booked.',
      )
      expect(saveButtons()[0].getAttribute('aria-disabled')).toBeNull()

      save()
      await savedAnnouncement()
      expect(await savedHours(6)).toEqual(['08:00:00–12:00:00', '16:00:00–22:00:00'])
      expect(await savedHours(7)).toEqual(['07:00:00–12:00:00', '16:00:00–22:00:00'])
      expect(chips('Sat')).toEqual(['8:00 am–12:00 pm', '4:00–10:00 pm'])
      expect(screen.queryByText(/Changing open hours/)).toBeNull()
    } finally {
      await restoreSeed()
    }
  })

  it('keeps the Edit dialog open on overlapping ranges (walkthrough 5)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    const edit = screen.getByRole('button', { name: 'Edit Monday hours' })
    edit.focus()
    fireEvent.click(edit)
    const dialog = screen.getByRole('dialog', { name: 'Monday hours' })
    const range = (name: string) => within(within(dialog).getByRole('group', { name }))
    fireEvent.change(range('Hours 1').getByRole('combobox', { name: 'To' }), {
      target: { value: '20:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add hours' }))
    fireEvent.change(range('Hours 2').getByRole('combobox', { name: 'From' }), {
      target: { value: '19:00' },
    })
    fireEvent.change(range('Hours 2').getByRole('combobox', { name: 'To' }), {
      target: { value: '22:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Set Monday hours' }))
    range('Hours 2').getByText('Two ranges on Monday overlap. Change one and save again.')
    expect(screen.getByRole('dialog', { name: 'Monday hours' })).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Monday hours' })).toBeNull()
    expect(document.activeElement).toBe(edit)
    expect(chips('Mon')).toEqual(['5:30–10:00 pm'])
    expect(saveButtons()[0].getAttribute('aria-disabled')).toBe('true')
  })

  it('says the open hours were saved when the other changes weren’t (walkthrough 6)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Edit Monday hours' }))
      const dialog = screen.getByRole('dialog', { name: 'Monday hours' })
      fireEvent.change(within(dialog).getByRole('combobox', { name: 'From' }), {
        target: { value: '18:00' },
      })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Set Monday hours' }))
      type('Travel gap', '500')
      save()

      const words =
        'Your open hours were saved, but your other changes weren’t. Travel gap has a value that isn’t allowed. Check it and save again.'
      const alerts = await screen.findAllByRole('alert', {}, SAVE_WAIT)
      expect(alerts.map((alert) => alert.textContent)).toEqual([words, words])
      expect(chips('Mon')).toEqual(['6:00–10:00 pm'])
      // Monday is the saved hours now, so its note is gone; the gap still waits to be saved.
      expect(screen.queryByText(/Changing open hours/)).toBeNull()
      expect(textbox('Travel gap').value).toBe('500')
      expect(textbox('Travel gap').getAttribute('aria-invalid')).toBe('true')
      expect(saveButtons()[0].getAttribute('aria-disabled')).toBeNull()
      expect(await savedHours(1)).toEqual(['18:00:00–22:00:00'])
      expect((await saved())?.travel_gap_minutes).toBe(60)
    } finally {
      await restoreSeed()
    }
  })

  it('refuses an address that isn’t one, and saves no email as "" with a note (walkthrough 8)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    try {
      type('Your email', 'not an email')
      save()
      const words = 'Your email has a value that isn’t allowed. Check it and save again.'
      await waitFor(() => expect(screen.getAllByText(words)).toHaveLength(3), SAVE_WAIT)
      await waitFor(() => expect(document.activeElement).toBe(textbox('Your email')))

      type('Your email', '')
      const note = 'With no email, your schedule and late-change alerts aren’t sent.'
      expect(screen.getByRole('textbox', { name: 'Your email', description: new RegExp(note) }))
      save()
      await savedAnnouncement()
      expect((await saved())?.coach_email).toBe('')
      screen.getByText(note)
    } finally {
      await restoreSeed()
    }
  })

  it('recounts every package after a change of package size (walkthrough 9)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    try {
      type('Lessons per package', '2')
      screen.getByText('Package numbers and balances are recounted for every group straight away.')
      expect(
        screen.getByRole('textbox', { name: 'Lessons per package', description: /lessons$/ }),
      ).toBeTruthy()
      save()
      await savedAnnouncement()
      const balances = await readRows('group_balance', {
        columns: ['group_id', 'package_no', 'can_still_book'],
      })
      const of = (id: string) => balances.find((balance) => balance.group_id === id)
      expect(of('c0000000-0000-4000-8000-000000000001')?.package_no).toBe(7) // Aiman & Sofia
      expect(of('c0000000-0000-4000-8000-000000000003')?.package_no).toBe(11) // Hana
      expect(of('c0000000-0000-4000-8000-000000000004')?.can_still_book).toBe(-1) // Wei Jie
    } finally {
      await restoreSeed()
    }
  })

  it('asks before leaving with unsaved changes (walkthrough 10)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { router } = await renderLoaded()
    type('Travel gap', '30')
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Leave without saving?',
      description: 'You have changes that aren’t saved.',
    })
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: 'Keep editing' }),
    )

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/coach/settings')
    expect(textbox('Travel gap').value).toBe('30')

    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }))
    await screen.findByRole('heading', { level: 1, name: 'Schedule' })
    expect(router.state.location.pathname).toBe('/coach/schedule')
    expect((await saved())?.travel_gap_minutes).toBe(60)
  })

  it('goes where the coach asked once a save that was running has finished (§6.6)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { router } = await renderLoaded()
    try {
      type('Travel gap', '30')
      save()
      // Leaving while it saves: the question first…
      fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
      await screen.findByRole('alertdialog', { name: 'Leave without saving?' })
      // …then, once it is saved and nothing is left to save, the page that was asked for.
      await screen.findByRole('heading', { level: 1, name: 'Schedule' }, SAVE_WAIT)
      expect(router.state.location.pathname).toBe('/coach/schedule')
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect((await saved())?.travel_gap_minutes).toBe(30)
    } finally {
      await restoreSeed()
    }
  })

  it('keeps asking when a save that was running is refused', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { router } = await renderLoaded()
    type('Travel gap', '500')
    save()
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' })
    await waitFor(
      () => expect(textbox('Travel gap').getAttribute('aria-invalid')).toBe('true'),
      SAVE_WAIT,
    )
    expect(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBe(dialog)
    expect(router.state.location.pathname).toBe('/coach/settings')
    expect((await saved())?.travel_gap_minutes).toBe(60)
  })

  it('lets the coach leave at once when nothing changed', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { router } = await renderLoaded()
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    await screen.findByRole('heading', { level: 1, name: 'Schedule' })
    expect(router.state.location.pathname).toBe('/coach/schedule')
  })

  it('makes the form read-only and says "Saving…" while it saves', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    try {
      type('Booking window', '5')
      save()
      for (const button of saveButtons()) {
        expect(button.textContent).toBe('Saving…')
        expect(button.getAttribute('aria-disabled')).toBe('true')
        expect(button.getAttribute('aria-busy')).toBe('true')
      }
      expect(textbox('Booking window').readOnly).toBe(true)
      expect(textbox('Travel gap').readOnly).toBe(true)
      expect(
        screen.getByRole('button', { name: 'Edit Monday hours' }).getAttribute('aria-disabled'),
      ).toBe('true')
      expect(textbox('Travel gap').closest('form')?.getAttribute('aria-busy')).toBe('true')
      // A change while saving is ignored.
      type('Travel gap', '30')
      expect(textbox('Travel gap').value).toBe('60')
      await savedAnnouncement()
      expect(textbox('Booking window').readOnly).toBe(false)
      expect((await saved())?.booking_window_weeks).toBe(5)
    } finally {
      await restoreSeed()
    }
  })

  it('shows fresh settings wherever nothing is changed, and keeps what the coach typed', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { queryClient } = await renderLoaded()
    try {
      // Typed back to the saved value: nothing to save, so fresh data shows there too.
      type('Travel gap', '45')
      type('Travel gap', '60')
      type('Cancel or reschedule', '8')
      fireEvent.click(screen.getByRole('button', { name: 'Edit Tuesday hours' }))
      fireEvent.click(screen.getByRole('button', { name: 'Remove 5:30 pm to 10:00 pm' }))
      fireEvent.click(screen.getByRole('button', { name: 'Add hours' }))
      fireEvent.change(screen.getByRole('combobox', { name: 'From' }), {
        target: { value: '17:30' },
      })
      fireEvent.change(screen.getByRole('combobox', { name: 'To' }), {
        target: { value: '22:00' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Set Tuesday hours' }))
      expect(screen.queryByText(/Changing open hours/)).toBeNull()

      // Another device saves meanwhile, and the page reads the settings again.
      await rpc('update_settings', {
        p_settings: { travel_gap_minutes: 30, booking_window_weeks: 5, cancel_cutoff_hours: 12 },
      })
      await rpc('set_open_hours', {
        p_rules: SEED_RULES.map((rule) =>
          rule.weekday === 2 ? { ...rule, opens_at: '18:00' } : rule,
        ),
      })
      await act(() => queryClient.invalidateQueries())
      await waitFor(() => expect(textbox('Booking window').value).toBe('5'))
      expect(textbox('Travel gap').value).toBe('30')
      expect(chips('Tue')).toEqual(['6:00–10:00 pm'])
      // The coach's own change stays, and is still the only thing to save.
      expect(textbox('Cancel or reschedule').value).toBe('8')
      expect(saveButtons()[0].getAttribute('aria-disabled')).toBeNull()
      expect(screen.queryByText(/Changing open hours/)).toBeNull()
    } finally {
      await restoreSeed()
    }
  })

  it('says when every day is closed, and shows a range to midnight as it is', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await rpc('set_open_hours', { p_rules: [] })
    try {
      await renderLoaded()
      for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
        within(dayRow(day)).getByText('Closed')
      }
      screen.getByText('Every day is closed, so customers can’t book any lessons.')
      cleanup()

      await rpc('set_open_hours', {
        p_rules: [{ weekday: 2, opens_at: '17:30', closes_at: '24:00' }],
      })
      await renderLoaded()
      expect(chips('Tue')).toEqual(['5:30 pm–12:00 am'])
      within(dayRow('Mon')).getByText('Closed')
      expect(screen.queryByText(/Every day is closed/)).toBeNull()
    } finally {
      await restoreSeed()
    }
  })

  it('lands on the section a link names once the sections are in', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const scrolled: Element[] = []
    const scrollIntoView = function (this: Element) {
      scrolled.push(this)
    }
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    })
    try {
      await renderLoaded('/coach/settings#packages')
      await waitFor(() =>
        expect(scrolled).toContain(screen.getByRole('region', { name: 'Packages & payments' })),
      )
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    }
  })

  it('shows the generic message and Try again when the settings can’t be read (a customer)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderPage()
    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert.textContent).toContain(GENERIC_MESSAGE)
    const tryAgain = within(alert).getByRole('button', { name: 'Try again' })
    screen.getByRole('heading', { level: 1, name: 'Settings' })
    // The header's Save, unavailable; no Save bar.
    expect(saveButtons()).toHaveLength(1)
    expect(saveButtons()[0].getAttribute('aria-disabled')).toBe('true')
    expect(screen.queryByRole('textbox')).toBeNull()

    const reads = await holdReads('settings')
    try {
      const words = within(alert).getByText(GENERIC_MESSAGE)
      tryAgain.focus()
      fireEvent.click(tryAgain)
      // It reads the settings again. Meanwhile the banner stays, with its button busy and
      // still focused: no skeleton in its place.
      await waitFor(() => expect(tryAgain.getAttribute('aria-busy')).toBe('true'))
      expect(reads.count()).toBe(1)
      expect(tryAgain.getAttribute('aria-disabled')).toBe('true')
      expect(document.activeElement).toBe(tryAgain)
      expect(screen.queryByText('Loading settings…')).toBeNull()
      expect(saveButtons()).toHaveLength(1)

      // Refused again: the same banner and button, still focused, with the words given anew
      // so that they are read out again.
      reads.release()
      await waitFor(() => expect(tryAgain.getAttribute('aria-busy')).toBeNull())
      expect(screen.getByRole('alert')).toBe(alert)
      expect(document.activeElement).toBe(tryAgain)
      expect(within(alert).getByText(GENERIC_MESSAGE)).not.toBe(words)
    } finally {
      reads.restore()
    }
  })

  it('moves focus to the title when Try again brings the settings in (§6.3)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    renderPage()
    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    const tryAgain = within(alert).getByRole('button', { name: 'Try again' })
    // The coach signs in meanwhile, so the settings can be read this time.
    await logIn('herman', DEMO_PASSWORD)
    tryAgain.focus()
    fireEvent.click(tryAgain)
    await screen.findByRole('textbox', { name: 'Travel gap' }, { timeout: 3000 })
    expect(screen.queryByRole('alert')).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { level: 1, name: 'Settings' }),
      ),
    )
    expect(saveButtons()).toHaveLength(2)
  })

  it('leaves the title alone when the settings load at once', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await renderLoaded()
    const title = screen.getByRole('heading', { level: 1, name: 'Settings' })
    expect(document.activeElement).not.toBe(title)
    expect(title.getAttribute('tabindex')).toBeNull()
  })
})

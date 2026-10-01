import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { AddBookingDialog } from './AddBookingDialog'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 2026, 12:00 pm). The coach books (the Schedule spec §8.3). Bookings stay for later tests
// in this file, so the clash checks come before the bookings that would change them.

const GROUPS = {
  aimanSofia: 'c0000000-0000-4000-8000-000000000001',
  weiJie: 'c0000000-0000-4000-8000-000000000004',
  daniel: 'c0000000-0000-4000-8000-000000000011',
}

/** The live check waits 300 ms for the input to settle, then asks the demo database. */
const CHECKED = { timeout: 4000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

/** jsdom has no scrollIntoView: a stand-in that records what asked to be shown. */
function watchScrolling() {
  const scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: scrollIntoView,
    configurable: true,
    writable: true,
  })
  return scrollIntoView
}

async function renderDialog(defaultDate = '2026-09-29') {
  await logIn('herman', DEMO_PASSWORD)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  const onBooked = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <AddBookingDialog open onClose={onClose} defaultDate={defaultDate} onBooked={onBooked} />
    </QueryClientProvider>,
  )
  const dialog = await screen.findByRole('dialog', { name: 'Add booking' })
  // The group list, once the groups and the account names are in.
  await within(dialog).findByRole(
    'radio',
    { name: 'Aiman & Sofia Mei Ling’s account · Palm Court 1-to-2' },
    CHECKED,
  )
  return { dialog, onClose, onBooked }
}

function primary(dialog: HTMLElement) {
  const [button] = within(dialog)
    .getAllByRole('button')
    .filter((each) => each.getAttribute('type') === 'submit')
  return button
}

function choose(dialog: HTMLElement, groupId: string, date: string, start: string) {
  const radio = within(dialog)
    .getAllByRole('radio')
    .find((each) => (each as HTMLInputElement).value === groupId)
  if (!radio) throw new Error(`No group ${groupId}`)
  fireEvent.click(radio)
  fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: date } })
  fireEvent.change(within(dialog).getByLabelText('Start'), { target: { value: start } })
}

function startAt(dialog: HTMLElement, start: string) {
  fireEvent.change(within(dialog).getByLabelText('Start'), { target: { value: start } })
}

describe('AddBookingDialog', () => {
  it('opens on the page’s day with the search focused and nothing chosen (§6.4)', async () => {
    const { dialog } = await renderDialog('2026-10-03')
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(within(dialog).getByText('The customer isn’t emailed.')).toBeTruthy()
    const search = within(dialog).getByRole('searchbox', { name: 'Search groups' })
    expect(document.activeElement).toBe(search)
    expect(search.getAttribute('placeholder')).toBe('Search by student or account name')
    expect(within(dialog).getByLabelText<HTMLInputElement>('Date').value).toBe('2026-10-03')
    expect(within(dialog).getByLabelText<HTMLInputElement>('Start').value).toBe('')
    expect(within(dialog).getByRole('radio', { name: '1 hour' })).toHaveProperty('checked', true)
    expect(within(dialog).getByRole('checkbox', { name: 'Repeat weekly' })).toHaveProperty(
      'checked',
      false,
    )
    const button = primary(dialog)
    expect(button.textContent).toBe('Pick a group')
    expect(button.getAttribute('aria-disabled')).toBe('true')
  })

  it('lists the active groups with whose account they are, and searches them', async () => {
    const { dialog } = await renderDialog()
    expect(within(dialog).getAllByRole('radio', { name: /account|Own account/ })).toHaveLength(13)
    expect(
      within(dialog).getByRole('radio', { name: 'Hana Farah’s account · Sunrise Res. 1-to-1' }),
    ).toBeTruthy()
    expect(
      within(dialog).getByRole('radio', { name: 'Wei Jie Own account · Palm Court 1-to-1' }),
    ).toBeTruthy()
    const search = within(dialog).getByRole('searchbox', { name: 'Search groups' })
    fireEvent.change(search, { target: { value: 'farah' } })
    expect(
      within(dialog)
        .getAllByRole('radio', { name: /account/ })
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['c0000000-0000-4000-8000-000000000003'])
    fireEvent.change(search, { target: { value: 'zz' } })
    expect(within(dialog).getByRole('status').textContent).toBe('No active group matches “zz”.')
  })

  it('checks the first week as the coach types, in the coach’s words (§8.3)', async () => {
    const { dialog } = await renderDialog()
    choose(dialog, GROUPS.aimanSofia, '2026-09-29', '17:30')
    expect(
      await within(dialog).findByText('It overlaps another lesson at 5:30–6:30 pm.', {}, CHECKED),
    ).toBeTruthy()
    expect(primary(dialog).textContent).toBe('Pick a free time')
    expect(primary(dialog).getAttribute('aria-disabled')).toBe('true')

    startAt(dialog, '18:30')
    expect(
      await within(dialog).findByText(
        'It starts too soon after the lesson that ends at 6:30 pm. You need 1 hour to travel between lessons. Turn on “Skip travel gap” to book it anyway.',
        {},
        CHECKED,
      ),
    ).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Skip travel gap' }))
    expect(
      within(dialog).getByText(
        'You may have less than 1 hour to travel before or after this lesson.',
      ),
    ).toBeTruthy()
    await waitFor(
      () => expect(primary(dialog).textContent).toBe('Book 6:30 pm for Aiman & Sofia'),
      CHECKED,
    )
    expect(primary(dialog).getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Skip travel gap' }))

    startAt(dialog, '15:00')
    expect(
      await within(dialog).findByText(
        'It’s outside your open hours. Turn on “Outside open hours” to book it anyway.',
        {},
        CHECKED,
      ),
    ).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Outside open hours' }))
    expect(
      within(dialog).getByText('Open hours and start times aren’t checked for this lesson.'),
    ).toBeTruthy()
    await waitFor(
      () => expect(primary(dialog).textContent).toBe('Book 3:00 pm for Aiman & Sofia'),
      CHECKED,
    )
    startAt(dialog, '15:10')
    await waitFor(
      () => expect(primary(dialog).textContent).toBe('Book 3:10 pm for Aiman & Sofia'),
      CHECKED,
    )
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Outside open hours' }))

    startAt(dialog, '17:45')
    expect(
      await within(dialog).findByText(
        'It starts between your usual start times. Turn on “Outside open hours” to book it anyway.',
        {},
        CHECKED,
      ),
    ).toBeTruthy()
  })

  it('summarises the lesson and books it, then hands the page its day and notice', async () => {
    const { dialog, onBooked } = await renderDialog()
    choose(dialog, GROUPS.aimanSofia, '2026-09-29', '19:30')
    await waitFor(
      () => expect(primary(dialog).textContent).toBe('Book 7:30 pm for Aiman & Sofia'),
      CHECKED,
    )
    expect(within(dialog).getByText('Tue 29 Sep · 7:30–8:30 pm')).toBeTruthy()
    expect(within(dialog).getByText('Aiman & Sofia · 1-to-2 · Palm Court')).toBeTruthy()
    fireEvent.click(primary(dialog))
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1), CHECKED)
    expect(onBooked).toHaveBeenCalledWith({
      bookingIds: [expect.any(String)],
      firstDate: '2026-09-29',
      notice: 'Booked Tue 29 Sep, 7:30–8:30 pm for Aiman & Sofia.',
    })
    const [booking] = await readRows('bookings', {
      eq: { id: (onBooked.mock.calls[0][0] as { bookingIds: string[] }).bookingIds[0] },
    })
    expect(booking).toMatchObject({ group_id: GROUPS.aimanSofia, status: 'booked' })
  })

  it('lists each week that clashes and books none of them (repeat_conflict, §8.3)', async () => {
    const { dialog, onBooked } = await renderDialog()
    choose(dialog, GROUPS.daniel, '2026-09-22', '17:30')
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Repeat weekly' }))
    const weeks = within(dialog).getByRole<HTMLInputElement>('spinbutton', {
      name: 'Number of weeks',
    })
    fireEvent.change(weeks, { target: { value: '3' } })
    expect(within(dialog).getByText('Every week for 3 weeks, until Tue 6 Oct')).toBeTruthy()
    expect(
      await within(dialog).findByText(
        'Only the first week is checked now. The other weeks are checked when you book.',
        {},
        CHECKED,
      ),
    ).toBeTruthy()
    // A past start (Tue 22 Sep) is allowed: it counts as used.
    expect(
      within(dialog).getByText('This time has passed. The lesson counts as used.'),
    ).toBeTruthy()
    expect(primary(dialog).textContent).toBe('Book 3 weeks for Daniel')
    const scrollIntoView = watchScrolling()
    fireEvent.click(primary(dialog))
    const alert = await within(dialog).findByRole('alert', {}, CHECKED)
    expect(alert.textContent).toBe(
      'These weeks clash: Tue 29 Sep. Nothing was booked. Try another time or turn off repeat.' +
        'Tue 29 Sep: It overlaps another lesson at 5:30–6:30 pm.',
    )
    expect(onBooked).not.toHaveBeenCalled()
    // The refusal comes into view above the buttons, and the live check steps back while it
    // shows (the past warning stays).
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    expect(scrollIntoView.mock.contexts).toContain(alert)
    expect(
      within(dialog).queryByText(
        'Only the first week is checked now. The other weeks are checked when you book.',
      ),
    ).toBeNull()
    expect(
      within(dialog).getByText('This time has passed. The lesson counts as used.'),
    ).toBeTruthy()
    // A change makes the refusal out of date: it goes, and the check speaks again.
    fireEvent.change(weeks, { target: { value: '2' } })
    expect(within(dialog).queryByRole('alert')).toBeNull()
    expect(
      await within(dialog).findByText(
        'Only the first week is checked now. The other weeks are checked when you book.',
        {},
        CHECKED,
      ),
    ).toBeTruthy()
  })

  it('offers “Book anyway” past the group’s credit, and books every week then (§8.3)', async () => {
    const { dialog, onBooked } = await renderDialog()
    choose(dialog, GROUPS.weiJie, '2026-10-06', '17:30')
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Repeat weekly' }))
    await waitFor(
      () => expect(primary(dialog).textContent).toBe('Book 2 weeks for Wei Jie'),
      CHECKED,
    )
    fireEvent.click(primary(dialog))
    const alert = await within(dialog).findByRole('alert', {}, CHECKED)
    expect(alert.textContent).toBe(
      'This group can book 1 more lesson before paying. Record a payment first, or choose “Book anyway”.',
    )
    expect(primary(dialog).textContent).toBe('Book anyway')
    fireEvent.click(primary(dialog))
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1), CHECKED)
    expect(onBooked).toHaveBeenCalledWith({
      bookingIds: [expect.any(String), expect.any(String)],
      firstDate: '2026-10-06',
      notice: 'Booked 2 weeks for Wei Jie from Tue 6 Oct.',
    })
    const [balance] = await readRows('group_balance', { eq: { group_id: GROUPS.weiJie } })
    expect(balance.can_still_book).toBe(-1)
  })

  it('keeps the number of weeks inside 2 to 52', async () => {
    const { dialog } = await renderDialog()
    choose(dialog, GROUPS.daniel, '2026-10-07', '17:30')
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Repeat weekly' }))
    const weeks = within(dialog).getByRole<HTMLInputElement>('spinbutton', {
      name: 'Number of weeks',
    })
    fireEvent.change(weeks, { target: { value: '1' } })
    expect(primary(dialog).textContent).toBe('Choose 2 to 52 weeks')
    fireEvent.blur(weeks)
    expect(weeks.value).toBe('2')
    fireEvent.change(weeks, { target: { value: '90' } })
    fireEvent.blur(weeks)
    expect(weeks.value).toBe('52')
  })
})

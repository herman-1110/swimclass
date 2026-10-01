import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { coachWeekQuery } from '@/entities/schedule'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { BlockTimeDialog } from './BlockTimeDialog'
import { OpenExtraTimeDialog } from './OpenExtraTimeDialog'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 2026, 12:00 pm). Saved exceptions stay for later tests in this file.

const SLOW = { timeout: 4000 }

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

async function renderDialog(kind: 'closed' | 'open', defaultDate: string) {
  await logIn('herman', DEMO_PASSWORD)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const Dialog = kind === 'closed' ? BlockTimeDialog : OpenExtraTimeDialog
  render(
    <QueryClientProvider client={queryClient}>
      <Dialog open onClose={onClose} defaultDate={defaultDate} onSaved={onSaved} />
    </QueryClientProvider>,
  )
  const dialog = screen.getByRole('dialog', {
    name: kind === 'closed' ? 'Block time' : 'Open extra time',
  })
  // The times are choices once the settings (the start step) are in.
  await waitFor(() => expect(select(dialog, 'From').options.length).toBeGreaterThan(1), SLOW)
  return { dialog, onSaved, queryClient }
}

function select(dialog: HTMLElement, label: 'From' | 'To') {
  return within(dialog).getByRole<HTMLSelectElement>('combobox', { name: label })
}

function primary(dialog: HTMLElement) {
  const [button] = within(dialog)
    .getAllByRole('button')
    .filter((each) => each.getAttribute('type') === 'submit')
  return button
}

/** coach_week for the week of `weekStart`, as the coach. */
async function coachWeek(weekStart: string) {
  const client = new QueryClient()
  return client.fetchQuery(coachWeekQuery(weekStart))
}

describe('BlockTimeDialog', () => {
  it('opens on the day’s open hours and lists the lessons they would leave booked', async () => {
    const { dialog } = await renderDialog('closed', '2026-10-03')
    expect(
      within(dialog).getByText(
        'Customers can’t book blocked time. Your weekly open hours don’t change.',
      ),
    ).toBeTruthy()
    const date = within(dialog).getByLabelText<HTMLInputElement>('Date')
    expect(document.activeElement).toBe(date)
    expect(date.value).toBe('2026-10-03')
    // Saturday 3 Oct is open 7:00 am–12:00 pm and 4:00–10:00 pm.
    await waitFor(() => expect(select(dialog, 'From').value).toBe('07:00'), SLOW)
    expect(select(dialog, 'To').value).toBe('22:00')
    expect(within(dialog).getByText('These lessons stay booked:')).toBeTruthy()
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Sat 3 Oct, 9:00–10:00 am · Aiman & Sofia',
      'Sat 3 Oct, 11:00 am–12:00 pm · Adam, Alya & Amir',
      'Sat 3 Oct, 5:00–6:00 pm · Hana',
    ])
    expect(primary(dialog).textContent).toBe('Block time')
  })

  it('offers every 30-minute step from midnight to midnight', async () => {
    const { dialog } = await renderDialog('closed', '2026-10-03')
    await waitFor(() => expect(select(dialog, 'From').value).toBe('07:00'), SLOW)
    const from = [...select(dialog, 'From').options].map((option) => option.textContent)
    expect(from).toHaveLength(49)
    expect(from.slice(0, 3)).toEqual(['Choose', '12:00 am', '12:30 am'])
    expect(from.at(-1)).toBe('11:30 pm')
    const to = [...select(dialog, 'To').options].map((option) => option.textContent)
    expect(to[1]).toBe('7:30 am')
    expect(to.at(-1)).toBe('12:00 am (midnight)')
  })

  it('says why it can’t save: the end before the start, the last day before the first', async () => {
    const { dialog } = await renderDialog('closed', '2026-10-03')
    await waitFor(() => expect(select(dialog, 'From').value).toBe('07:00'), SLOW)
    fireEvent.change(select(dialog, 'To'), { target: { value: '09:00' } })
    fireEvent.change(select(dialog, 'From'), { target: { value: '10:00' } })
    expect(
      within(dialog).getByText(
        'The end time must be after the start time. Change it and try again.',
      ),
    ).toBeTruthy()
    expect(primary(dialog).getAttribute('aria-disabled')).toBe('true')
    fireEvent.change(select(dialog, 'From'), { target: { value: '07:00' } })
    fireEvent.change(within(dialog).getByLabelText('Until (optional)'), {
      target: { value: '2026-10-01' },
    })
    expect(within(dialog).getByText('The last day must be on or after the first day.')).toBeTruthy()
    expect(primary(dialog).getAttribute('aria-disabled')).toBe('true')
  })

  it('warns that a lesson stays booked, and blocks the time with a private note (§8.3)', async () => {
    const { dialog, onSaved } = await renderDialog('closed', '2026-10-03')
    await waitFor(() => expect(select(dialog, 'From').value).toBe('07:00'), SLOW)
    fireEvent.change(select(dialog, 'To'), { target: { value: '10:00' } })
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Sat 3 Oct, 9:00–10:00 am · Aiman & Sofia'])
    fireEvent.change(select(dialog, 'To'), { target: { value: '09:00' } })
    expect(within(dialog).queryByText('These lessons stay booked:')).toBeNull()
    fireEvent.change(within(dialog).getByLabelText('Note (optional)'), {
      target: { value: 'Pool maintenance' },
    })
    fireEvent.click(primary(dialog))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), SLOW)
    expect(onSaved).toHaveBeenCalledWith({ firstDate: '2026-10-03', notice: 'Time blocked.' })
    const saturday = (await coachWeek('2026-09-28'))[5]
    expect(saturday.exceptions).toEqual([
      expect.objectContaining({ kind: 'closed', note: 'Pool maintenance' }),
    ])
    expect(saturday.open).toEqual([
      { starts_at: '2026-10-03T09:00:00+08:00', ends_at: '2026-10-03T12:00:00+08:00' },
      { starts_at: '2026-10-03T16:00:00+08:00', ends_at: '2026-10-03T22:00:00+08:00' },
    ])
  })

  it('blocks the same hours on each day of a range', async () => {
    const { dialog, onSaved } = await renderDialog('closed', '2026-10-05')
    fireEvent.change(within(dialog).getByLabelText('Until (optional)'), {
      target: { value: '2026-10-07' },
    })
    fireEvent.change(select(dialog, 'From'), { target: { value: '06:00' } })
    fireEvent.change(select(dialog, 'To'), { target: { value: '07:00' } })
    fireEvent.click(primary(dialog))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), SLOW)
    expect(onSaved).toHaveBeenCalledWith({
      firstDate: '2026-10-05',
      notice: 'Time blocked on 3 days.',
    })
    const week = await coachWeek('2026-10-05')
    expect(week.slice(0, 3).map((day) => day.exceptions.length)).toEqual([1, 1, 1])
  })

  it('says which days were saved when a range stops part way, and carries on from there', async () => {
    // A Monday refused by the database, as a failure part way through would be.
    const db = await demoDb()
    await db.exec(`alter table public.availability_exceptions add constraint test_no_monday
      check (extract(isodow from starts_at at time zone 'Asia/Kuala_Lumpur') <> 1) not valid`)
    try {
      const { dialog, onSaved } = await renderDialog('closed', '2026-10-10')
      fireEvent.change(within(dialog).getByLabelText('Until (optional)'), {
        target: { value: '2026-10-12' },
      })
      fireEvent.change(select(dialog, 'From'), { target: { value: '06:00' } })
      fireEvent.change(select(dialog, 'To'), { target: { value: '06:30' } })
      const scrollIntoView = watchScrolling()
      fireEvent.click(primary(dialog))
      const alert = await within(dialog).findByRole('alert', {}, SLOW)
      expect(alert.textContent).toBe(
        'Blocked Sat 10 Oct and Sun 11 Oct. Mon 12 Oct wasn’t blocked: Something went wrong. Refresh the page and try again.',
      )
      // It comes into view above the buttons: the form may be scrolled to its top.
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
      expect(scrollIntoView.mock.contexts).toContain(alert)
      expect(within(dialog).getByLabelText<HTMLInputElement>('Date').value).toBe('2026-10-12')
      expect(onSaved).not.toHaveBeenCalled()
    } finally {
      await db.exec('alter table public.availability_exceptions drop constraint test_no_monday')
    }
  })
})

describe('OpenExtraTimeDialog', () => {
  it('starts on “Choose” and opens the time (§8.3: Wed 7 Oct 3:00–5:30 pm)', async () => {
    const { dialog, onSaved } = await renderDialog('open', '2026-10-07')
    expect(
      within(dialog).getByText(
        'Customers can book this time on this date only. Your weekly open hours don’t change.',
      ),
    ).toBeTruthy()
    expect(select(dialog, 'From').value).toBe('')
    expect(select(dialog, 'To').value).toBe('')
    expect(within(dialog).queryByLabelText('Until (optional)')).toBeNull()
    expect(primary(dialog).getAttribute('aria-disabled')).toBe('true')
    fireEvent.change(select(dialog, 'From'), { target: { value: '15:00' } })
    fireEvent.change(select(dialog, 'To'), { target: { value: '17:30' } })
    fireEvent.click(primary(dialog))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), SLOW)
    expect(onSaved).toHaveBeenCalledWith({ firstDate: '2026-10-07', notice: 'Extra time opened.' })
    const wednesday = (await coachWeek('2026-10-05'))[2]
    expect(wednesday.open).toEqual([
      { starts_at: '2026-10-07T15:00:00+08:00', ends_at: '2026-10-07T22:00:00+08:00' },
    ])
  })

  it('warns when the time is blocked, and says when it is open already', async () => {
    // Sat 3 Oct is blocked 7:00–9:00 am by an earlier test.
    const { dialog } = await renderDialog('open', '2026-10-03')
    fireEvent.change(select(dialog, 'From'), { target: { value: '07:30' } })
    fireEvent.change(select(dialog, 'To'), { target: { value: '08:30' } })
    expect(
      await within(dialog).findByText(
        'Part of this time is blocked (7:00–9:00 am). Blocked time wins, so it stays closed. Remove the block first.',
        {},
        SLOW,
      ),
    ).toBeTruthy()
    fireEvent.change(select(dialog, 'From'), { target: { value: '18:00' } })
    fireEvent.change(select(dialog, 'To'), { target: { value: '19:00' } })
    expect(within(dialog).getByText('This time is already open.')).toBeTruthy()
  })
})

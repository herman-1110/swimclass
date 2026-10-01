import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logOut } from '@/shared/api/auth'

import { cardNames, findTable, GROUP, renderAs, stubWidth, tableNames } from './testing'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT,
// signed in as herman (coach-students §8). This file only reads; the writes are in
// CoachStudentsPage.actions.test.tsx. jsdom has no CSS, so the table and the cards are both
// in the page.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const ALL = [
  'Hana',
  'Wei Jie',
  'Priya',
  'Sofia',
  'Adam, Alya & Amir',
  'Aiman & Sofia',
  'Aina',
  'Chloe',
  'Daniel',
  'Ethan',
  'Jun Hao',
  'Kai',
  'Nurul',
]

describe('CoachStudentsPage', () => {
  it('shows its title at once, and names the tab after it', async () => {
    await renderAs('herman')
    expect(screen.getByRole('heading', { level: 1, name: 'Students & payments' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Add students' })).toHaveLength(1)
    expect(screen.getByRole('searchbox', { name: 'Search students' })).toBeTruthy()
    expect(screen.getByText('Loading students and payments').getAttribute('role')).toBe('status')
    await waitFor(() => expect(document.title).toBe('Students & payments · Swim Class'))
    await findTable()
  })

  it('shows the figures, the tabs and every package, needs action first', async () => {
    await renderAs('herman')
    const table = await findTable()
    expect(screen.getByText('Unpaid · Hana, Wei Jie')).toBeTruthy()
    expect(screen.getByText('On last lesson · Priya, Sofia')).toBeTruthy()
    expect(screen.getByText('Students · 13 packages').previousElementSibling?.textContent).toBe(
      '15',
    )
    const tabs = screen.getByRole('group', { name: 'Filter packages' })
    expect(
      within(tabs)
        .getAllByRole('button')
        .map((tab) => tab.textContent),
    ).toEqual(['All 13', 'Unpaid 2', 'Last lesson 2', 'Paid 11', 'Waiting for approval 0'])
    expect(within(tabs).getByRole('button', { name: 'All 13' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    // Collapsed as drawn: 9 table rows and 5 cards, then "Show all".
    expect(tableNames(table)).toEqual(ALL.slice(0, 9))
    expect(cardNames()).toEqual(ALL.slice(0, 5))
    expect(screen.getByText('Needs action first · 13 packages')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(tableNames(table)).toEqual(ALL)
    expect(cardNames()).toEqual(ALL)
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull()
  })

  it('shows each row’s package, status, last payment and action as in the seed', async () => {
    await renderAs('herman')
    const table = await findTable()
    const hana = within(table).getAllByRole('row')[1]
    expect(hana.getAttribute('aria-current')).toBeNull()
    expect(within(hana).getByText('Farah’s account · Sunrise Res.')).toBeTruthy()
    expect(within(hana).getByText('1-to-1')).toBeTruthy()
    expect(within(hana).getByRole('img', { name: '0 used, 2 booked, 2 left of 4' })).toBeTruthy()
    expect(within(hana).getByText('Unpaid').nextElementSibling?.textContent).toBe('Starts today')
    expect(within(hana).getByText('22 Aug').nextElementSibling?.textContent).toBe('Cash')
    expect(within(hana).getByRole('button', { name: 'Record payment for Hana' })).toBeTruthy()
    const priya = within(table).getAllByRole('row')[3]
    expect(within(priya).getByText('Last lesson 1 Oct')).toBeTruthy()
    expect(within(priya).getByRole('button', { name: 'History for Priya' })).toBeTruthy()
    expect(within(table).getAllByRole('button', { name: /^Record payment for / })).toHaveLength(2)
    // The cards join the last payment to the note.
    expect(screen.getByText('Starts today · last paid 22 Aug, cash')).toBeTruthy()
    expect(screen.getByText('Since 18 Sep · last paid 16 Aug, FPX')).toBeTruthy()
  })

  it('filters by tab, keeping the tab in the address', async () => {
    const router = await renderAs('herman')
    const table = await findTable()
    fireEvent.click(screen.getByRole('button', { name: 'Unpaid 2' }))
    expect(router.state.location.search).toBe('?filter=unpaid')
    expect(tableNames(table)).toEqual(['Hana', 'Wei Jie'])
    expect(screen.getByText('Needs action first · 2 packages')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Last lesson 2' }))
    expect(tableNames(table)).toEqual(['Priya', 'Sofia'])
    fireEvent.click(screen.getByRole('button', { name: 'Paid 11' }))
    expect(tableNames(table)).toEqual(ALL.slice(2, 11))
    fireEvent.click(screen.getByRole('button', { name: 'All 13' }))
    expect(router.state.location.search).toBe('')
  })

  it('collapses the list again when the tab changes after "Show all"', async () => {
    await renderAs('herman')
    const table = await findTable()
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(tableNames(table)).toEqual(ALL)
    fireEvent.click(screen.getByRole('button', { name: 'Paid 11' }))
    expect(tableNames(table)).toEqual(ALL.slice(2, 11))
    expect(screen.getByRole('button', { name: 'Show all' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'All 13' }))
    expect(tableNames(table)).toEqual(ALL.slice(0, 9))
    expect(screen.getByRole('button', { name: 'Show all' })).toBeTruthy()
  })

  it('opens on the tab in the address; Waiting for approval is empty in the seed', async () => {
    await renderAs('herman', '/coach/students?filter=waiting')
    expect(
      await screen.findByText('No accounts are waiting for approval.', {}, { timeout: 5000 }),
    ).toBeTruthy()
    const waiting = screen.getByRole('button', { name: 'Waiting for approval 0' })
    expect(waiting.getAttribute('aria-pressed')).toBe('true')
  })

  it('searches students and account holders, and says when nothing matches', async () => {
    await renderAs('herman')
    const table = await findTable()
    const search = screen.getByRole('searchbox', { name: 'Search students' })
    fireEvent.change(search, { target: { value: 'mei ling' } })
    expect(tableNames(table)).toEqual(['Sofia', 'Aiman & Sofia'])
    expect(screen.getByRole('button', { name: 'All 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Paid 2' })).toBeTruthy()
    // The figures ignore the search.
    expect(screen.getByText('Unpaid · Hana, Wei Jie')).toBeTruthy()
    fireEvent.change(search, { target: { value: 'zz' } })
    expect(screen.getByText('No students match “zz”.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(document.activeElement).toBe(search)
    expect(tableNames(await findTable())).toEqual(ALL.slice(0, 9))
  })

  it('opens Record payment for a row as a panel below 1280 px, and closes it', async () => {
    const router = await renderAs('herman')
    const table = await findTable()
    fireEvent.click(within(table).getByRole('button', { name: 'Record payment for Hana' }))
    const panel = screen.getByRole('dialog', {
      name: 'Record payment',
      description: 'Hana · Farah’s account',
    })
    expect(router.state.location.search).toBe(`?pay=${GROUP.hana}`)
    expect(within(table).getAllByRole('row')[1].getAttribute('aria-current')).toBe('true')
    expect(
      await within(panel).findByRole('option', { name: '1-to-1 · Package 6 · 4 lessons' }),
    ).toBeTruthy()
    expect(
      within(panel).getByText(
        'No price is set for this lesson type. Type the amount, or set the price in Settings.',
      ),
    ).toBeTruthy()
    expect(within(panel).getByText('Other adjustments')).toBeTruthy()
    expect(
      within(panel).getByText(
        'Online payments (FPX, DuitNow) record themselves once a payment gateway is connected.',
      ),
    ).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.search).toBe('')
  })

  it('shows the first row in the panel beside the list from 1280 px', async () => {
    stubWidth(1440)
    const router = await renderAs('herman')
    const table = await findTable()
    const panel = await screen.findByRole('complementary', {
      name: 'Record payment',
      description: 'Hana · Farah’s account',
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(table).getAllByRole('row')[1].getAttribute('aria-current')).toBe('true')
    fireEvent.click(within(table).getByRole('button', { name: 'Record payment for Wei Jie' }))
    expect(router.state.location.search).toBe(`?pay=${GROUP.weiJie}`)
    expect(
      within(panel).getByRole('option', { name: '1-to-1 · Package 2 · 4 lessons' }),
    ).toBeTruthy()
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Record payment'))
  })

  it('shows a group’s History: payments, lessons and the group', async () => {
    await renderAs('herman', `/coach/students?history=${GROUP.hana}`)
    const drawer = await screen.findByRole(
      'dialog',
      { name: 'History', description: 'Hana · Farah’s account' },
      { timeout: 5000 },
    )
    const payments = within(drawer).getByRole('region', { name: 'Payments' })
    expect(await within(payments).findByText('RM 240 · 4 lessons')).toBeTruthy()
    expect(within(payments).getByText('22 Aug · Cash')).toBeTruthy()
    expect(within(payments).getByText('Starting balance · 16 lessons paid')).toBeTruthy()
    const lessons = within(drawer).getByRole('region', { name: 'Lessons' })
    expect(await within(lessons).findByText('Sat 3 Oct, 5:00–6:00 pm')).toBeTruthy()
    expect(within(lessons).getByText('Booked · Package 6 · lesson 2 of 4')).toBeTruthy()
    expect(within(lessons).getByText('Booked · Package 6 · lesson 1 of 4')).toBeTruthy()
    expect(within(lessons).getByText('Starting balance · 20 lessons used')).toBeTruthy()
    const group = within(drawer).getByRole('region', { name: 'Group' })
    expect(within(group).getByText('20 used · 16 paid')).toBeTruthy()
    expect(within(group).getByRole('button', { name: 'Edit group' })).toBeTruthy()
    expect(within(group).getByRole('button', { name: 'Deactivate group' })).toBeTruthy()
  })

  it('records a payment from History, for paying ahead', async () => {
    const router = await renderAs('herman')
    const table = await findTable()
    fireEvent.click(within(table).getByRole('button', { name: 'History for Priya' }))
    const drawer = screen.getByRole('dialog', { name: 'History' })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Record payment for Priya' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Record payment',
      description: 'Priya · Own account',
    })
    expect(router.state.location.search).toBe(`?pay=${GROUP.priya}`)
    expect(
      within(panel).getByRole('option', { name: '1-to-1 · Package 5 · 4 lessons' }),
    ).toBeTruthy()
  })

  it('from 1280 px, takes History’s Record payment to the panel beside the list', async () => {
    stubWidth(1440)
    const router = await renderAs('herman')
    const table = await findTable()
    fireEvent.click(within(table).getByRole('button', { name: 'History for Priya' }))
    const drawer = screen.getByRole('dialog', { name: 'History' })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Record payment for Priya' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.search).toBe(`?pay=${GROUP.priya}`)
    const panel = screen.getByRole('complementary', {
      name: 'Record payment',
      description: 'Priya · Own account',
    })
    await waitFor(() =>
      expect(document.activeElement).toBe(within(panel).getByRole('heading', { level: 2 })),
    )
  })

  it('lists the lessons that can be excused in the panel', async () => {
    await renderAs('herman', `/coach/students?pay=${GROUP.weiJie}`)
    const panel = await screen.findByRole(
      'dialog',
      { name: 'Record payment', description: 'Wei Jie · Own account' },
      { timeout: 5000 },
    )
    await within(panel).findByRole('combobox', { name: 'Package' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Excuse a missed lesson' }))
    expect(
      await within(panel).findByRole('radio', {
        name: 'Fri 25 Sep, 7:30–8:30 pm Package 2 · lesson 2 of 4',
      }),
    ).toBeTruthy()
    expect(
      within(panel).getByRole('radio', {
        name: 'Fri 18 Sep, 7:30–8:30 pm Package 2 · lesson 1 of 4',
      }),
    ).toBeTruthy()
  })

  it('drops a group id that doesn’t exist from the address', async () => {
    const router = await renderAs('herman', '/coach/students?pay=nope&history=nope&filter=paid')
    await findTable()
    await waitFor(() => expect(router.state.location.search).toBe('?filter=paid'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('highlights a group just added and says so, then drops it from the address', async () => {
    const router = await renderAs('herman', `/coach/students?added=${GROUP.weiJie}`)
    await findTable()
    expect((await screen.findByText('Student added')).closest('[role=status]')).toBeTruthy()
    const cards = within(
      screen.getByRole('list', { name: 'Packages, needs action first' }),
    ).getAllByRole('listitem')
    expect(cards.map((card) => card.getAttribute('aria-current'))).toEqual([
      null,
      'true',
      null,
      null,
      null,
    ])
    expect(router.state.location.search).toBe('')
  })

  it('says when the list can’t be read, in place of the figures and list, with Try again', async () => {
    await renderAs('herman', '/coach/students', { readsFail: true })
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 })
    expect(alert.textContent).toContain('Something went wrong. Refresh the page and try again.')
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Filter packages' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Students & payments' })).toBeTruthy()
  })
})

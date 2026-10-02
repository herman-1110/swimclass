import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { findTable, GROUP, listAnnouncer, renderAs, tableNames } from './testing'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT,
// signed in as herman. These tests change the data, in order (coach-students §8, "Actions
// and their results"); the database is this file's own. jsdom has no matchMedia, so the
// payment panel is the modal one (below 1280 px).

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  // The seed has no accounts waiting for approval: sign two up.
  for (const [username, displayName] of [
    ['siti', 'Siti Rahman'],
    ['nadia', 'Nadia Yusof'],
  ]) {
    await signUp({
      username,
      displayName,
      email: `${username}@example.com`,
      phone: '012-345 6789',
      password: DEMO_PASSWORD,
    })
  }
}, 60_000)

afterEach(cleanup)

const rowOf = async (names: string) => {
  const table = await findTable()
  const row = within(table)
    .getAllByRole('row')
    .find((tr) => tr.querySelector('th[scope=row] span')?.textContent === names)
  if (!row) throw new Error(`No row for ${names}`)
  return row
}

async function openPanel(groupId: string) {
  await renderAs('herman', `/coach/students?pay=${groupId}`)
  const panel = await screen.findByRole('dialog', { name: 'Record payment' }, { timeout: 5000 })
  await within(panel).findByRole('combobox', { name: 'Package' })
  return panel
}

/** Presses a button as a person does: focus first (so a dialog knows its opener). */
function press(button: HTMLElement) {
  button.focus()
  fireEvent.click(button)
}

/** Fills in and saves a payment of 240 in the open panel. */
async function pay240(panel: HTMLElement, changes: { method?: string; date?: string } = {}) {
  fireEvent.change(within(panel).getByRole('textbox', { name: 'Amount (RM)' }), {
    target: { value: '240' },
  })
  if (changes.method) fireEvent.click(within(panel).getByRole('radio', { name: changes.method }))
  if (changes.date) {
    fireEvent.change(within(panel).getByLabelText('Date paid'), { target: { value: changes.date } })
  }
  const save = within(panel).getByRole('button', { name: 'Save payment' })
  fireEvent.click(save)
  await waitFor(() => expect(save.textContent).toBe('Payment saved'))
}

describe('CoachStudentsPage actions', () => {
  it('adds a free lesson for Hana: still unpaid, now from her next lesson', async () => {
    const panel = await openPanel(GROUP.hana)
    fireEvent.click(within(panel).getByRole('button', { name: 'Add a free lesson' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Add 1 free lesson' }))
    expect(await within(panel).findByRole('button', { name: 'Free lesson added' })).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    const hana = await rowOf('Hana')
    await waitFor(() => expect(within(hana).getByText('Starts 3 Oct')).toBeTruthy())
    expect(within(hana).getByText('26 Sep').nextElementSibling?.textContent).toBe('Free lesson')
    expect(within(hana).getByText('Unpaid')).toBeTruthy()
  })

  it('records Hana’s payment: she becomes Paid, and the figures and tabs follow', async () => {
    const panel = await openPanel(GROUP.hana)
    const save = within(panel).getByRole('button', { name: 'Save payment' })
    fireEvent.click(save)
    expect(
      await within(panel).findByText(
        'No price is set for this lesson type. Type the amount, or set the price in Settings.',
        { selector: '[id$="-error"]' },
      ),
    ).toBeTruthy()
    fireEvent.change(within(panel).getByRole('textbox', { name: 'Amount (RM)' }), {
      target: { value: '240' },
    })
    fireEvent.click(save)
    await waitFor(() => expect(save.textContent).toBe('Payment saved'))
    expect(screen.getByText('Unpaid · Wei Jie')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unpaid 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Paid 12' })).toBeTruthy()
    // Hana moved down among the paid rows; the list shows her as the panel's group.
    const hana = await rowOf('Hana')
    expect(hana.getAttribute('aria-current')).toBe('true')
    expect(within(hana).getByText('Paid')).toBeTruthy()
    expect(within(hana).getByText('26 Sep').nextElementSibling?.textContent).toBe('Cash')
    expect(within(hana).getByRole('button', { name: 'History for Hana' })).toBeTruthy()
    // Paid rows go by name: she is between Ethan and Jun Hao.
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(tableNames(await findTable())).toEqual([
      'Wei Jie',
      'Priya',
      'Sofia',
      'Adam, Alya & Amir',
      'Aiman & Sofia',
      'Aina',
      'Chloe',
      'Daniel',
      'Ethan',
      'Hana',
      'Jun Hao',
      'Kai',
      'Nurul',
    ])
  })

  it('excuses Wei Jie’s Fri 25 Sep lesson: it no longer counts', async () => {
    const panel = await openPanel(GROUP.weiJie)
    fireEvent.click(within(panel).getByRole('button', { name: 'Excuse a missed lesson' }))
    fireEvent.click(
      await within(panel).findByRole('radio', {
        name: 'Fri 25 Sep, 7:30–8:30 pm Package 2 · lesson 2 of 4',
      }),
    )
    fireEvent.click(within(panel).getByRole('button', { name: 'Excuse Fri 25 Sep lesson' }))
    expect(await within(panel).findByText('Lesson excused.')).toBeTruthy()
    const weiJie = await rowOf('Wei Jie')
    await waitFor(() => expect(within(weiJie).getByText('1 used · 1 booked')).toBeTruthy())
    expect(within(weiJie).getByText('Since 18 Sep')).toBeTruthy()
  })

  it('records Wei Jie’s payment from the Unpaid tab: he leaves it, and focus goes to the tab', async () => {
    const router = await renderAs('herman', '/coach/students?filter=unpaid')
    const table = await findTable()
    press(within(table).getByRole('button', { name: 'Record payment for Wei Jie' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Record payment',
      description: 'Wei Jie · Own account',
    })
    await within(panel).findByRole('combobox', { name: 'Package' })
    await pay240(panel, { method: 'Transfer', date: '2026-09-25' })
    expect(await screen.findByText('No unpaid packages.')).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.search).toBe('?filter=unpaid')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Unpaid 0' }))
    // Paid rows go by name, so on All he is past the collapse.
    fireEvent.click(screen.getByRole('button', { name: 'All 13' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    const weiJie = await rowOf('Wei Jie')
    expect(within(weiJie).getByText('Paid')).toBeTruthy()
    expect(within(weiJie).getByText('25 Sep').nextElementSibling?.textContent).toBe('Transfer')
  })

  it('records Priya’s payment from History: she is no longer on her last lesson', async () => {
    const router = await renderAs('herman')
    const table = await findTable()
    const history = within(table).getByRole('button', { name: 'History for Priya' })
    press(history)
    const drawer = screen.getByRole('dialog', { name: 'History' })
    press(within(drawer).getByRole('button', { name: 'Record payment for Priya' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Record payment',
      description: 'Priya · Own account',
    })
    await within(panel).findByRole('combobox', { name: 'Package' })
    await pay240(panel)
    expect(screen.getByText('On last lesson · Sofia').previousElementSibling?.textContent).toBe('1')
    // She moved past the collapse (paid rows go by name), yet focus goes back to her row.
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.search).toBe('')
    expect(document.activeElement).toBe(history)
    expect(history.isConnected).toBe(true)
    // The collapsed list now runs on to her row (Sofia, then the paid rows by name).
    expect(tableNames(table).at(-1)).toBe('Priya')
    expect(tableNames(table)).toHaveLength(12)
  })

  it('moves Hana to a new pool from History, with her upcoming lessons', async () => {
    await renderAs('herman', `/coach/students?history=${GROUP.hana}`)
    const drawer = await screen.findByRole('dialog', { name: 'History' }, { timeout: 5000 })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Edit group' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit group' })
    fireEvent.change(within(dialog).getByLabelText('Pool location'), {
      target: { value: 'Sunrise Residence' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    const group = within(drawer).getByRole('region', { name: 'Group' })
    expect(await within(group).findByText('Changes saved.')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Edit group' })).toBeNull()
    expect(within(group).getByText('Sunrise Residence')).toBeTruthy()
    const lessons = within(drawer).getByRole('region', { name: 'Lessons' })
    await waitFor(() => expect(within(lessons).getAllByText('Sunrise Residence')).toHaveLength(2))
  })

  it('can’t deactivate a seed group: it has lessons ahead', async () => {
    await renderAs('herman', `/coach/students?history=${GROUP.priya}`)
    const drawer = await screen.findByRole('dialog', { name: 'History' }, { timeout: 5000 })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Deactivate group' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Deactivate Priya?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Deactivate group' }))
    expect((await within(confirm).findByRole('alert')).textContent).toBe(
      'This group has 2 upcoming lessons. Cancel them first, then deactivate it. Each cancellation emails the customer.',
    )
  })

  it('approves the accounts waiting for approval, keeping focus in the list', async () => {
    await renderAs('herman')
    await findTable()
    fireEvent.click(screen.getByRole('button', { name: 'Waiting for approval 2' }))
    const region = listAnnouncer()
    await waitFor(() => expect(region.textContent).toBe('2 accounts'))
    const table = screen.getByRole('table', { name: 'Accounts waiting for approval' })
    const [siti, nadia] = within(table).getAllByRole('row').slice(1)
    expect(within(siti).getByRole('rowheader').textContent).toBe('Siti Rahman siti')
    expect(within(siti).getByText('012-345 6789')).toBeTruthy()
    expect(within(nadia).getByRole('rowheader').textContent).toBe('Nadia Yusof nadia')
    // Approved, the account leaves the list: focus goes to the next one's Approve.
    press(within(siti).getByRole('button', { name: 'Approve Siti Rahman' }))
    expect(await screen.findByText('Siti Rahman approved.')).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(table).getByRole('button', { name: 'Approve Nadia Yusof' }),
      ),
    )
    expect(screen.getByRole('button', { name: 'Waiting for approval 1' })).toBeTruthy()
    // The last one: focus goes to the notice, above the empty list.
    press(within(table).getByRole('button', { name: 'Approve Nadia Yusof' }))
    const notice = await screen.findByText('Nadia Yusof approved.')
    expect(await screen.findByText('No accounts are waiting for approval.')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(notice))
    expect(screen.getByRole('button', { name: 'Waiting for approval 0' })).toBeTruthy()
    // Approvals aren't announced as a search result: only the tab change was.
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(region.textContent).toBe('2 accounts')
  })

  it('moves focus to the History of “that group” when a group can’t be reactivated', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const zulaikha = 'a0000000-0000-4000-8000-000000000006'
    const old = await rpc('create_group', {
      p_account_id: zulaikha,
      p_students: [{ name: 'Hakim' }],
      p_location: 'Maple Condo',
    })
    await rpc('set_group_active', { p_group_id: old, p_active: false })
    const [hakim] = await readRows('group_details', { eq: { group_id: old } })
    const current = await rpc('create_group', {
      p_account_id: zulaikha,
      p_students: [{ student_id: hakim?.student_ids?.[0] }],
      p_location: 'Palm Court',
    })
    const router = await renderAs('herman', `/coach/students?history=${old}`)
    const drawer = await screen.findByRole('dialog', { name: 'History' }, { timeout: 5000 })
    expect(within(drawer).getByText('Maple Condo · Inactive')).toBeTruthy()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Reactivate group' }))
    const link = await within(drawer).findByRole('link', { name: 'that group' })
    press(link)
    await waitFor(() => expect(router.state.location.search).toBe(`?history=${current}`))
    // The drawer now shows the active group, and its title has focus (the link went).
    expect(within(drawer).queryByText('Maple Condo · Inactive')).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(within(drawer).getByRole('heading', { level: 2 })),
    )
  })
})

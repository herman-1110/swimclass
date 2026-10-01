import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logOut, signUp } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { findTable, GROUP, renderAs } from './testing'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT,
// signed in as herman. These tests change the data, in order (coach-students §8, "Actions
// and their results"); the database is this file's own.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  // The seed has no accounts waiting for approval: sign one up.
  await signUp({
    username: 'siti',
    displayName: 'Siti Rahman',
    email: 'siti@example.com',
    phone: '012-345 6789',
    password: DEMO_PASSWORD,
  })
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
    expect(await within(panel).findByText('Lesson excused')).toBeTruthy()
    const weiJie = await rowOf('Wei Jie')
    await waitFor(() => expect(within(weiJie).getByText('1 used · 1 booked')).toBeTruthy())
    expect(within(weiJie).getByText('Since 18 Sep')).toBeTruthy()
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
    expect(await within(group).findByText('Changes saved')).toBeTruthy()
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

  it('approves an account waiting for approval', async () => {
    await renderAs('herman', '/coach/students?filter=waiting')
    const tab = await screen.findByRole(
      'button',
      { name: 'Waiting for approval 1' },
      { timeout: 5000 },
    )
    expect(tab.getAttribute('aria-pressed')).toBe('true')
    const table = screen.getByRole('table', { name: 'Accounts waiting for approval' })
    const [row] = within(table).getAllByRole('row').slice(1)
    expect(within(row).getByRole('rowheader').textContent).toBe('Siti Rahman siti')
    expect(within(row).getByText('012-345 6789')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: 'Approve Siti Rahman' }))
    expect(await screen.findByText('Siti Rahman approved')).toBeTruthy()
    expect(await screen.findByText('No accounts are waiting for approval.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Waiting for approval 0' })).toBeTruthy()
  })
})

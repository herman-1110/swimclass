import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { findTable, GROUP, renderAs, stubWidth } from './testing'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT,
// signed in as herman, at 1440 px. The prices are set, so the panel's amount is filled in and
// the coach can save without typing (coach-students §5.2.8, §6 Success). The database is this
// file's own.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
  await rpc('update_settings', {
    p_settings: { price_1to1_cents: 24000, price_1to2_cents: 40000, price_1to3_cents: 54000 },
  })
}, 60_000)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** The panel beside the list, once its form is in. */
async function findPanel(description: string) {
  const panel = await screen.findByRole('complementary', { name: 'Record payment', description })
  await within(panel).findByRole('combobox', { name: 'Package' })
  return panel
}

describe('CoachStudentsPage from 1280 px', () => {
  it('saves the first row’s payment without typing: it stays in the panel as "Payment saved"', async () => {
    stubWidth(1440)
    const router = await renderAs('herman')
    await findTable()
    const panel = await findPanel('Hana · Farah’s account')
    expect(
      within(panel).getByRole<HTMLInputElement>('textbox', { name: 'Amount (RM)' }).value,
    ).toBe('240')
    const save = within(panel).getByRole('button', { name: 'Save payment' })
    save.focus()
    fireEvent.click(save)
    // The address names the group before the payment is written, so the list's new order
    // can't take the panel to another group.
    await waitFor(() => expect(router.state.location.search).toBe(`?pay=${GROUP.hana}`))
    await waitFor(() => expect(save.textContent).toBe('Payment saved'))
    expect(save.isConnected).toBe(true)
    expect(document.activeElement).toBe(save)
    expect(save.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('complementary', { description: 'Hana · Farah’s account' })).toBe(panel)
    // A second press records nothing.
    fireEvent.click(save)
    const payments = await readRows('payments', { eq: { group_id: GROUP.hana } })
    expect(payments).toHaveLength(2)
    // Hana is paid now, and still the highlighted row.
    const table = await findTable()
    const hana = within(table).getByRole('button', { name: 'History for Hana' }).closest('tr')
    expect(hana?.getAttribute('aria-current')).toBe('true')
  })

  it('adds a free lesson for the first row without a note: it stays in the panel', async () => {
    stubWidth(1440)
    const router = await renderAs('herman', '/coach/students?filter=last-lesson')
    await findTable()
    const panel = await findPanel('Priya · Own account')
    fireEvent.click(within(panel).getByRole('button', { name: 'Add a free lesson' }))
    const add = within(panel).getByRole('button', { name: 'Add 1 free lesson' })
    add.focus()
    fireEvent.click(add)
    await waitFor(() => expect(add.textContent).toBe('Free lesson added'))
    expect(router.state.location.search).toBe(`?filter=last-lesson&pay=${GROUP.priya}`)
    expect(document.activeElement).toBe(add)
    // Priya has left the Last lesson tab (paid 17), and the panel keeps her.
    await waitFor(() => expect(screen.getByText('On last lesson · Sofia')).toBeTruthy())
    expect(screen.getByRole('complementary', { description: 'Priya · Own account' })).toBe(panel)
  })
})

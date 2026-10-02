import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logOut } from '@/shared/api/auth'
import { NETWORK_MESSAGE } from '@/shared/config/messages'

import { findTable, GROUP, loseReads, renderAs, stubWidth } from './testing'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT,
// signed in as herman. A read fails, then "Try again" reads it again on a slow connection:
// the button keeps its place and focus meanwhile, and focus goes on to what replaces it
// (coach-students §6, §7), never to the page.

const SLOW = { timeout: 5000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Presses the focused "Try again" in `alert`, as Enter does. */
function retryFrom(alert: HTMLElement) {
  const retry = within(alert).getByRole('button', { name: 'Try again' })
  retry.focus()
  fireEvent.click(retry)
  return retry
}

describe('CoachStudentsPage: Try again', () => {
  it('keeps "Try again" busy and focused while the list is read again, then focus goes to the tab', async () => {
    const groups = await loseReads(['group_details'])
    await renderAs('herman')
    const alert = await screen.findByRole('alert', {}, SLOW)
    expect(alert.textContent).toContain(NETWORK_MESSAGE)

    // Still no connection: it fails again, and the button stays, with focus.
    const retry = retryFrom(alert)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBeNull())
    expect(document.activeElement).toBe(retry)
    expect(screen.getByRole('alert')).toBe(alert)

    groups.reconnect()
    fireEvent.click(retry)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(retry)
    expect(retry.getAttribute('aria-disabled')).toBe('true')
    expect(alert.textContent).toContain(NETWORK_MESSAGE)

    groups.release()
    await findTable()
    expect(screen.queryByRole('alert')).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'All 13' })),
    )
  })

  it('keeps History’s "Try again" focused while the payments are read again, then focus goes to their heading', async () => {
    const payments = await loseReads(['payments'])
    await renderAs('herman', `/coach/students?history=${GROUP.hana}`)
    const drawer = await screen.findByRole('dialog', { name: 'History' }, SLOW)
    const section = within(drawer).getByRole('region', { name: 'Payments' })
    const alert = await within(section).findByRole('alert', {}, SLOW)
    expect(alert.textContent).toContain(NETWORK_MESSAGE)

    payments.reconnect()
    const retry = retryFrom(alert)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(retry)
    // Not loading as well: the message and its button say what is happening.
    expect(section.getAttribute('aria-busy')).toBeNull()
    expect(within(section).queryByText('Loading payments…')).toBeNull()

    payments.release()
    expect(await within(section).findByText('RM 240 · 4 lessons', {}, SLOW)).toBeTruthy()
    expect(within(section).queryByRole('alert')).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(section).getByRole('heading', { level: 3, name: 'Payments' }),
      ),
    )
  })

  it('keeps the payment panel’s "Try again" focused while the prices are read again, then focus goes to its title', async () => {
    stubWidth(1440)
    const prices = await loseReads(['get_public_settings'])
    await renderAs('herman')
    await findTable()
    const panel = screen.getByRole('complementary', { name: 'Record payment' })
    const alert = await within(panel).findByRole('alert', {}, SLOW)
    expect(alert.textContent).toContain(NETWORK_MESSAGE)

    prices.reconnect()
    const retry = retryFrom(alert)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(retry)

    prices.release()
    expect(await within(panel).findByRole('combobox', { name: 'Package' }, SLOW)).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(panel).getByRole('heading', { level: 2, name: 'Record payment' }),
      ),
    )
  })
})

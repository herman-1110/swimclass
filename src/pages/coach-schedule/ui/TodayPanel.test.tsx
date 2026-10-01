import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { TodayPanel } from './TodayPanel'

// Runs in demo mode: the real migrations and seed in PGlite, as herman. The seed has no
// lessons on Mon 21 Sep and three on Sat 26 Sep (the Schedule spec §8.1).

const SLOW = { timeout: 4000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
}, 60_000)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPanel(today: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TodayPanel today={today} />
    </QueryClientProvider>,
  )
}

/** coach_week fails as on a lost connection, until the returned function is called. */
async function loseConnection() {
  const backend = await getBackend()
  const rpc = backend.rpc.bind(backend)
  let lost = true
  vi.spyOn(backend, 'rpc').mockImplementation((fn, args) =>
    lost && fn === 'coach_week' ? Promise.reject(new TypeError('Failed to fetch')) : rpc(fn, args),
  )
  return () => {
    lost = false
  }
}

describe('TodayPanel', () => {
  it('says so on a day without lessons (§6.2)', async () => {
    renderPanel('2026-09-21')
    const today = screen.getByRole('region', { name: 'Today, Mon 21 Sep' })
    expect(await within(today).findByText('No lessons today.', {}, SLOW)).toBeTruthy()
    expect(within(today).queryByRole('list')).toBeNull()
  })

  it('says why when the day can’t be read, and “Try again” hands focus to the lessons', async () => {
    const reconnect = await loseConnection()
    renderPanel('2026-09-26')
    const today = screen.getByRole('region', { name: 'Today, Sat 26 Sep' })
    const alert = await within(today).findByRole('alert', {}, SLOW)
    expect(alert.textContent).toBe(
      'Couldn’t reach the server. Check your connection and try again.Try again',
    )
    reconnect()
    const retry = within(alert).getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    const rows = await within(today).findAllByRole('listitem', {}, SLOW)
    expect(rows).toHaveLength(3)
    // Not dropped to the page with the button: the section the lessons are in has it.
    expect(document.activeElement).toBe(today)
    await waitFor(() => expect(within(today).queryByRole('alert')).toBeNull())
  })
})

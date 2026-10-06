import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { EmailLogSection } from './EmailLogSection'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const HANA_SAT_3_OCT = 'd0000000-0000-4000-8000-000000000005'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <EmailLogSection />
    </QueryClientProvider>,
  )
  return screen.getByRole('region', { name: 'Email log' })
}

describe('EmailLogSection', () => {
  it('shows the coach the emails the site queued, from email_log()', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const before = renderSection()
    expect(await within(before).findByText('No emails yet.')).toBeTruthy()
    cleanup()

    // The coach cancels Hana's Sat 3 Oct lesson (seed.sql): Farah gets the cancellation email.
    await rpc('cancel_booking', { p_booking_id: HANA_SAT_3_OCT })

    const after = renderSection()
    await waitFor(() =>
      expect(within(after).getAllByText('farah@example.com').length).toBeGreaterThan(0),
    )
    expect(within(after).getAllByText('Cancellation').length).toBeGreaterThan(0)
    expect(within(after).getAllByText('Waiting').length).toBeGreaterThan(0)
  })

  it('shows a customer the refusal, not the log', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const section = renderSection()
    expect(await within(section).findByRole('alert')).toBeTruthy()
    expect(within(section).queryByText('farah@example.com')).toBeNull()
  })
})

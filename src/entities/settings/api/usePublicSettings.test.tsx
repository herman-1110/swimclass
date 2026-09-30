import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { logIn, logOut, signUp } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { settingsKeys } from './keys'
import { usePublicSettings } from './usePublicSettings'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  // logOut() alone never opens it.
  await logOut()
  await rpc('username_available', { p_username: 'warm_up' })
}, 60_000)

afterEach(cleanup)

function renderUsePublicSettings() {
  // A new client per test, so no test sees another's cache; no retries, so errors show at
  // once. staleTime 0, so the hook's own staleTime is the one that counts.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => usePublicSettings(), { wrapper })
}

describe('usePublicSettings', () => {
  it('reads the seed’s settings for a signed-in customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUsePublicSettings()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      business_name: 'Swim Class',
      lesson_lengths: [60, 120],
      start_step_minutes: 30,
      travel_gap_minutes: 60,
      cancel_cutoff_hours: 6,
      booking_window_weeks: 4,
      lessons_per_package: 4,
      price_1to1_cents: null,
      price_1to2_cents: null,
      price_1to3_cents: null,
      payment_instructions: null,
    })
  })

  it('stays fresh for 5 minutes: settings change only when the coach saves them', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUsePublicSettings()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // With the client's staleTime of 0 the data would be stale at once.
    expect(result.current.isStale).toBe(false)
  })

  it('reads them for an account still waiting for approval', async () => {
    await signUp({
      username: 'settings_waiting',
      displayName: 'Still Waiting',
      email: 'settings-waiting@example.com',
      phone: null,
      password: DEMO_PASSWORD,
    })
    await logIn('settings_waiting', DEMO_PASSWORD)
    const { result } = renderUsePublicSettings()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.business_name).toBe('Swim Class')
  })

  it('fails with an AppError when signed out: anon may not read settings', async () => {
    await logOut()
    const { result } = renderUsePublicSettings()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'unknown' })
  })

  it('keys the query under settingsKeys.all, so a change can refresh it', () => {
    expect(settingsKeys.public()).toEqual(['settings', 'public'])
    expect(settingsKeys.coach()).toEqual(['settings', 'coach'])
  })
})

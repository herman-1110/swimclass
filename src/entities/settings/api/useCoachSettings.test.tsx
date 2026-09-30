import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { useCoachSettings } from './useCoachSettings'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await rpc('username_available', { p_username: 'warm_up' })
}, 60_000)

afterEach(cleanup)

function renderUseCoachSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useCoachSettings(), { wrapper })
}

describe('useCoachSettings', () => {
  it('reads the whole settings row for the coach', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderUseCoachSettings()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: 1,
      business_name: 'Swim Class',
      coach_email: 'herman@example.com',
      travel_gap_minutes: 60,
      start_step_minutes: 30,
      lesson_lengths: [60, 120],
      max_students_per_lesson: 3,
      cancel_cutoff_hours: 6,
      booking_window_weeks: 4,
      lessons_per_package: 4,
      unpaid_packages_allowed: 1,
      price_1to1_cents: null,
      price_1to2_cents: null,
      price_1to3_cents: null,
      payment_instructions: null,
      lesson_expiry_months: null,
      reminder_time: '20:00:00',
      digest_time: '20:00:00',
      booking_confirmations: true,
      late_change_alert: true,
      require_approval: true,
    })
  })

  it('shows what the coach saved', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await rpc('update_settings', { p_settings: { price_1to2_cents: 40000 } })
    const { result } = renderUseCoachSettings()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.price_1to2_cents).toBe(40000)
  })

  it('fails with not_found for a customer, whom RLS shows no row', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseCoachSettings()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'not_found' })
  })
})

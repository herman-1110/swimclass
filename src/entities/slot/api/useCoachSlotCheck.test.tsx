import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { mytInstant } from '@/shared/lib/time'

import type { CoachSlotCheckArgs } from '../model/types'
import { useCoachSlotCheck } from './useCoachSlotCheck'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW. The
// expected answers are data-contracts §3.11's, captured as herman.

const AIMAN_AND_SOFIA = 'c0000000-0000-4000-8000-000000000001'
// Each answer comes 300 ms after the input settles: room to spare when many tests run at once.
const settle = { timeout: 3000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

const tuesdayAt = (time: string, extra: Partial<CoachSlotCheckArgs> = {}): CoachSlotCheckArgs => ({
  p_group_id: AIMAN_AND_SOFIA,
  p_starts_at: mytInstant('2026-09-29', time).toISOString(),
  p_minutes: 60,
  ...extra,
})

function renderCheck(initial: CoachSlotCheckArgs | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(({ args }) => useCoachSlotCheck(args), {
    wrapper,
    initialProps: { args: initial },
  })
}

describe('useCoachSlotCheck', () => {
  it('says a free start is ok', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderCheck(tuesdayAt('19:30'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true), settle)
    expect(result.current.data).toEqual({ ok: true, reason: null, detail: null })
    expect(result.current.isChecking).toBe(false)
  })

  it('gives the reason and its detail, and follows the dialog’s two switches', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, rerender } = renderCheck(tuesdayAt('19:00'))
    await waitFor(() => expect(result.current.data?.ok).toBe(false), settle)
    expect(result.current.data).toEqual({
      ok: false,
      reason: 'gap_after',
      detail: { ends_at: '2026-09-29T18:30:00+08:00' },
    })

    rerender({ args: tuesdayAt('19:00', { p_gap_override: true }) })
    await waitFor(() => expect(result.current.data?.ok).toBe(true), settle)

    rerender({ args: tuesdayAt('15:00') })
    await waitFor(() => expect(result.current.data?.reason).toBe('outside_open_hours'), settle)

    rerender({ args: tuesdayAt('15:00', { p_ignore_open_hours: true }) })
    await waitFor(() => expect(result.current.data?.ok).toBe(true), settle)
  })

  it('waits for the input to settle, saying it is checking meanwhile', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, rerender } = renderCheck(tuesdayAt('19:30'))
    await waitFor(() => expect(result.current.data?.ok).toBe(true), settle)

    rerender({ args: tuesdayAt('17:30') })
    // Straight after the change: still the old answer, marked as being checked.
    expect(result.current.isChecking).toBe(true)
    expect(result.current.data?.ok).toBe(true)

    await waitFor(() => expect(result.current.isChecking).toBe(false), settle)
    expect(result.current.data).toMatchObject({ ok: false, reason: 'overlap_other' })
  })

  it('asks nothing and shows no answer while the input is incomplete', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, rerender } = renderCheck(null)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.isChecking).toBe(false)

    rerender({ args: tuesdayAt('19:30') })
    await waitFor(() => expect(result.current.data?.ok).toBe(true), settle)
    rerender({ args: null })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isChecking).toBe(false)
  })

  it('fails with not_coach for a customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderCheck(tuesdayAt('19:30'))
    await waitFor(() => expect(result.current.isError).toBe(true), settle)
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'not_coach' })
  })
})

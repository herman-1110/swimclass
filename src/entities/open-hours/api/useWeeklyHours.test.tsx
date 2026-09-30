import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { rangesByWeekday } from '../model/hours'
import { openHoursKeys } from './keys'
import { useWeeklyHours } from './useWeeklyHours'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderUseWeeklyHours() {
  // A new client per test, so no test sees another's cache; no retries, so errors show at once.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useWeeklyHours(), { wrapper })
}

describe('useWeeklyHours', () => {
  it('reads the seed’s weekly hours for the coach: weekday evenings, weekend mornings and evenings', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderUseWeeklyHours()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(9)
    expect(result.current.data?.[0]).toEqual({
      weekday: 1,
      opens_at: '17:30:00',
      closes_at: '22:00:00',
    })
    expect(rangesByWeekday(result.current.data ?? [])[5]).toEqual([
      { weekday: 6, opens_at: '07:00:00', closes_at: '12:00:00' },
      { weekday: 6, opens_at: '16:00:00', closes_at: '22:00:00' },
    ])
  })

  it('reads them for a customer too', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseWeeklyHours()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(9)
  })

  it('fails with an AppError when signed out', async () => {
    await logOut()
    const { result } = renderUseWeeklyHours()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'unknown' })
  })

  it('keys the query under openHoursKeys.all, so a change can refresh it', () => {
    expect(openHoursKeys.weekly()).toEqual(['open-hours', 'weekly'])
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { useCoachBalance, useCoachBalances } from './useCoachBalances'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const HANA = 'c0000000-0000-4000-8000-000000000003'
const NURUL = 'c0000000-0000-4000-8000-000000000013'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCoachBalances', () => {
  it('reads every group for the coach, with the flags the Students screen needs', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useCoachBalances(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const balances = result.current.data ?? []
    expect(balances).toHaveLength(13)
    expect(balances.filter((b) => b.unpaid).map((b) => b.group_id)).toEqual([
      HANA,
      'c0000000-0000-4000-8000-000000000004',
    ])
    expect(balances.filter((b) => b.last_lesson_at !== null)).toHaveLength(2)
  })

  it('shows a customer only their own groups', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderHook(() => useCoachBalances(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })
})

describe('useCoachBalance', () => {
  it('picks one group: Hana, unpaid since her lesson tonight', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useCoachBalance(HANA), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      package_no: 6,
      paid_lessons: 20,
      used_lessons: 20,
      booked_lessons: 2,
      unpaid: true,
      unpaid_since: '2026-09-26T11:30:00+00:00',
      can_still_book: 2,
      last_paid_on: '2026-08-22',
      last_payment_method: 'cash',
    })
  })

  it('keeps the nulls that are real: Nurul has no payment row', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useCoachBalance(NURUL), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      paid_lessons: 4,
      last_paid_on: null,
      last_payment_method: null,
      unpaid_since: null,
      last_lesson_at: null,
    })
  })
})

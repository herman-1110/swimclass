import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { balanceKeys } from './keys'
import { useAccountBalances } from './useAccountBalances'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const AIMAN_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function newClient() {
  // A new client per test, so no test sees another's cache; no retries, so errors show at once.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

async function signIn(username: string) {
  return (await logIn(username, DEMO_PASSWORD)).userId
}

describe('useAccountBalances', () => {
  it('reads meiling’s two groups as the seed has them', async () => {
    const meiling = await signIn('meiling')
    const { wrapper } = newClient()
    const { result } = renderHook(() => useAccountBalances(meiling), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((b) => b.group_id)).toEqual([AIMAN_SOFIA, SOFIA])
    expect(result.current.data?.[0]).toEqual({
      group_id: AIMAN_SOFIA,
      account_id: meiling,
      package_size: 4,
      paid_lessons: 16,
      used_lessons: 12,
      booked_lessons: 2,
      package_no: 4,
      used_in_package: 0,
      booked_in_package: 2,
      left_in_package: 2,
      unpaid: false,
      unpaid_since: null,
      can_still_book: 6,
      last_lesson_at: null,
      last_paid_on: '2026-09-19',
      last_payment_method: 'fpx',
    })
  })

  it('finds nothing for the coach’s own account, though RLS shows him every group', async () => {
    const herman = await signIn('herman')
    const { wrapper } = newClient()
    const { result } = renderHook(() => useAccountBalances(herman), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('waits while the account id is unknown', async () => {
    await signIn('meiling')
    const { wrapper } = newClient()
    const { result } = renderHook(() => useAccountBalances(null), { wrapper })
    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('balanceKeys', () => {
  it('keys every balance under balanceKeys.all, so a change can refresh them', () => {
    expect(balanceKeys.account('a').slice(0, 1)).toEqual([...balanceKeys.all])
    expect(balanceKeys.coach().slice(0, 1)).toEqual([...balanceKeys.all])
  })
})

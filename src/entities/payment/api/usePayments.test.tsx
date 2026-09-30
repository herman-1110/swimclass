import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { paymentKeys } from './keys'
import { useGroupPayments, usePayments } from './usePayments'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const AIMAN_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
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

describe('usePayments', () => {
  it('lists meiling’s payments, newest first', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderHook(() => usePayments([AIMAN_SOFIA, SOFIA]), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      {
        id: 'e0000000-0000-4000-8000-000000000001',
        group_id: AIMAN_SOFIA,
        lessons: 4,
        amount_cents: 40000,
        method: 'fpx',
        paid_on: '2026-09-19',
        note: null,
        created_at: expect.any(String) as string,
      },
      expect.objectContaining({
        id: 'e0000000-0000-4000-8000-000000000002',
        group_id: SOFIA,
        amount_cents: 24000,
        method: 'transfer',
        paid_on: '2026-08-29',
      }),
    ])
  })

  it('gives an empty list for an account with no groups', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => usePayments([]), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('reads nothing while closed or while the groups are unknown', () => {
    const closed = renderHook(() => usePayments([SOFIA], { enabled: false }), {
      wrapper: wrapper(),
    })
    const unknown = renderHook(() => usePayments(null), { wrapper: wrapper() })
    expect(closed.result.current.fetchStatus).toBe('idle')
    expect(unknown.result.current.fetchStatus).toBe('idle')
  })

  it('keys the same groups the same way, under paymentKeys.all', () => {
    expect(paymentKeys.groups([SOFIA, AIMAN_SOFIA])).toEqual(
      paymentKeys.groups([AIMAN_SOFIA, SOFIA]),
    )
    expect(paymentKeys.groups(null).slice(0, 1)).toEqual([...paymentKeys.all])
  })
})

describe('useGroupPayments', () => {
  it('lists one group’s payments for the coach', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useGroupPayments(HANA), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject([
      { group_id: HANA, lessons: 4, amount_cents: 24000, method: 'cash', paid_on: '2026-08-22' },
    ])
  })

  it('finds no payment for Nurul, whose lessons are a starting balance', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useGroupPayments(NURUL), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { groupKeys } from './keys'
import { useMyGroups } from './useMyGroups'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const MEILING = 'a0000000-0000-4000-8000-000000000002'
const HERMAN = 'a0000000-0000-4000-8000-000000000001'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderUseMyGroups(accountId: string | null) {
  // A new client per test, so no test sees another's cache; no retries, so errors show at once.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useMyGroups(accountId), { wrapper }), queryClient }
}

describe('useMyGroups', () => {
  it('reads a customer’s own groups, oldest first, with nothing null', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseMyGroups(MEILING)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      {
        group_id: 'c0000000-0000-4000-8000-000000000001',
        account_id: MEILING,
        location: 'Palm Court',
        active: true,
        opening_used_lessons: 12,
        opening_paid_lessons: 12,
        created_at: expect.any(String) as unknown,
        size: 2,
        type_label: '1-to-2',
        display_names: 'Aiman & Sofia',
        student_ids: [
          'b0000000-0000-4000-8000-000000000001',
          'b0000000-0000-4000-8000-000000000002',
        ],
      },
      {
        group_id: 'c0000000-0000-4000-8000-000000000002',
        account_id: MEILING,
        location: 'Palm Court',
        active: true,
        opening_used_lessons: 7,
        opening_paid_lessons: 4,
        created_at: expect.any(String) as unknown,
        size: 1,
        type_label: '1-to-1',
        display_names: 'Sofia',
        student_ids: ['b0000000-0000-4000-8000-000000000002'],
      },
    ])
  })

  it('finds no groups for the coach on customer pages, although RLS shows him all 13', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderUseMyGroups(HERMAN)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('reads nothing until it knows the account', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result, queryClient } = renderUseMyGroups(null)
    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
    expect(queryClient.getQueryState(groupKeys.mine(null))?.dataUpdatedAt ?? 0).toBe(0)
  })

  it('keeps paused groups, last as the newest, so past lessons still have names', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const hakim = await rpc('create_group', {
      p_account_id: MEILING,
      p_students: [{ name: 'Hakim' }],
      p_location: 'Palm Court',
    })
    await rpc('set_group_active', { p_group_id: hakim, p_active: false })

    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseMyGroups(MEILING)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((group) => [group.display_names, group.active])).toEqual([
      ['Aiman & Sofia', true],
      ['Sofia', true],
      ['Hakim', false],
    ])
  })

  it('keys the query by account under groupKeys.all', () => {
    expect(groupKeys.mine(MEILING)).toEqual(['group', 'mine', MEILING])
    expect(groupKeys.mine(MEILING).slice(0, 1)).toEqual([...groupKeys.all])
  })
})

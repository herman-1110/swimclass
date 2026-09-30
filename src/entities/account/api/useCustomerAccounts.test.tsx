import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { accountKeys } from './keys'
import { useAccountNames, useCustomerAccounts, usePendingAccounts } from './useCustomerAccounts'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderAccountHooks() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const rendered = renderHook(
    () => ({
      accounts: useCustomerAccounts(),
      names: useAccountNames(),
      pending: usePendingAccounts(),
      pendingByName: usePendingAccounts({ order: 'name' }),
    }),
    { wrapper },
  )
  return { ...rendered, queryClient }
}

describe('the coach’s customer accounts', () => {
  it('lists the approved customers by name, without the coach', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderAccountHooks()
    await waitFor(() => expect(result.current.accounts.isSuccess).toBe(true))
    expect(result.current.accounts.data?.map((a) => a.display_name)).toEqual([
      'Aina',
      'Daniel',
      'Ethan',
      'Farah',
      'Grace',
      'Jun Hao',
      'Kai',
      'Mei Ling',
      'Nurul',
      'Priya',
      'Wei Jie',
      'Zulaikha',
    ])
    expect(result.current.accounts.data?.[7]).toMatchObject({
      id: 'a0000000-0000-4000-8000-000000000002',
      username: 'meiling',
      phone: '012-000 0002',
      approved: true,
    })
  })

  it('gives each account’s name by id, for "Farah’s account"', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderAccountHooks()
    await waitFor(() => expect(result.current.names.isSuccess).toBe(true))
    const names = result.current.names.data
    expect(names?.get('a0000000-0000-4000-8000-000000000003')).toBe('Farah')
    expect(names?.get('a0000000-0000-4000-8000-000000000001')).toBeUndefined()
    expect(names?.size).toBe(12)
  })

  it('has no one waiting for approval in the seed', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderAccountHooks()
    await waitFor(() => expect(result.current.pending.isSuccess).toBe(true))
    expect(result.current.pending.data).toEqual([])
  })

  it('lists a new sign-up as waiting, oldest first, with no email until pending_accounts() exists', async () => {
    for (const [username, displayName] of [
      ['siti', 'Siti Rahman'],
      ['adam.w', 'Adam Wong'],
    ]) {
      await signUp({
        username,
        displayName,
        email: `${username}@example.com`,
        phone: username === 'siti' ? '012-345 6789' : null,
        password: DEMO_PASSWORD,
      })
    }
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderAccountHooks()
    await waitFor(() => expect(result.current.pending.isSuccess).toBe(true))
    const pending = result.current.pending.data ?? []
    expect(pending.map((a) => a.username)).toEqual(['siti', 'adam.w'])
    expect(pending[0]).toMatchObject({
      display_name: 'Siti Rahman',
      phone: '012-345 6789',
      email: null,
      email_confirmed: null,
    })
    expect(Object.keys(pending[0]).toSorted()).toEqual([
      'created_at',
      'display_name',
      'email',
      'email_confirmed',
      'id',
      'phone',
      'username',
    ])
    expect(pending[1]).toMatchObject({ display_name: 'Adam Wong', phone: null })
    // Needs attention lists them by name (the Schedule spec §3.6).
    expect(result.current.pendingByName.data?.map((a) => a.username)).toEqual(['adam.w', 'siti'])
    // Waiting accounts aren't offered in Add students, but their names are known.
    expect(result.current.accounts.data?.some((a) => a.username === 'siti')).toBe(false)
    expect([...(result.current.names.data?.values() ?? [])]).toContain('Siti Rahman')
  })

  it('reads the profiles once for every view', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, queryClient } = renderAccountHooks()
    await waitFor(() => expect(result.current.pendingByName.isSuccess).toBe(true))
    expect(queryClient.getQueryCache().findAll({ queryKey: accountKeys.all })).toHaveLength(1)
    expect(accountKeys.customers()).toEqual(['account', 'customers'])
  })

  it('shows a customer only their own account (RLS)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderAccountHooks()
    await waitFor(() => expect(result.current.accounts.isSuccess).toBe(true))
    expect(result.current.accounts.data?.map((a) => a.username)).toEqual(['meiling'])
  })
})
